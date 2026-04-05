import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const BACKEND_URL = Deno.env.get("BACKEND_URL");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

serve(async (req) => {
  if (req.method !== "POST" && req.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  if (!BACKEND_URL || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("[surveillance-cron] Missing required environment variables");
    return new Response(
      JSON.stringify({ error: "Server misconfiguration" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const results = { anomalies: 0, outbreaks: 0, errors: [] as string[] };

  try {
    // Call unified cron endpoint on Flask backend
    const backendRes = await fetch(`${BACKEND_URL}/api/surveillance/cron`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!backendRes.ok) {
      throw new Error(`Backend responded with status ${backendRes.status}`);
    }

    const data = await backendRes.json();

    // Process anomalies
    if (data.anomalies && Array.isArray(data.anomalies)) {
      results.anomalies = await processAnomalies(supabase, data.anomalies);
    }

    // Process outbreaks
    if (data.outbreaks && Array.isArray(data.outbreaks)) {
      results.outbreaks = await processOutbreaks(supabase, data.outbreaks);
    }

    // Log any partial failures from the backend
    if (data.errors && Array.isArray(data.errors)) {
      results.errors.push(...data.errors);
    }

    console.log(
      `[surveillance-cron] Processed ${results.anomalies} anomaly alerts, ${results.outbreaks} outbreak alerts`,
    );

    // Broadcast a single summary event to all connected clinicians
    // This triggers exactly 1 toast per cron run, regardless of alert count
    const broadcastChannel = supabase.channel("surveillance-cron-run");
    await new Promise<void>((resolve) => {
      broadcastChannel
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            resolve();
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            console.error(
              `[surveillance-cron] Broadcast channel ${status}`,
            );
            resolve(); // resolve anyway — don't block the response
          }
        });
    });

    broadcastChannel.send({
      type: "broadcast",
      event: "cron-run-complete",
      payload: {
        anomalyCount: results.anomalies,
        outbreakCount: results.outbreaks,
        timestamp: new Date().toISOString(),
      },
    });

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[surveillance-cron] Fatal error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        results,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});

async function processAnomalies(supabase: any, anomalies: any[]): Promise<number> {
  let created = 0;

  for (const anomaly of anomalies) {
    if (!anomaly.reason) continue;

    const diagnosisId = Number(anomaly.id);
    if (isNaN(diagnosisId)) continue;

    // Check if an ANOMALY alert already exists for this diagnosis
    const { data: existing } = await supabase
      .from("Alert")
      .select("id")
      .eq("type", "ANOMALY")
      .eq("diagnosisId", diagnosisId)
      .maybeSingle();

    if (existing) continue;

    const reasonCodes = anomaly.reason.split("|").filter(Boolean);
    const severity = mapReasonCodesToSeverity(reasonCodes);
    const message = buildAlertMessage(anomaly.disease, reasonCodes, severity);

    const { error } = await supabase.from("Alert").insert({
      type: "ANOMALY",
      severity,
      reasonCodes,
      message,
      diagnosisId,
      metadata: {
        disease: anomaly.disease,
        confidence: anomaly.confidence,
        uncertainty: anomaly.uncertainty,
        city: anomaly.city ?? undefined,
        province: anomaly.province ?? undefined,
        region: anomaly.region ?? undefined,
        barangay: anomaly.barangay ?? undefined,
        district: anomaly.district ?? undefined,
        latitude: anomaly.latitude ?? undefined,
        longitude: anomaly.longitude ?? undefined,
        patientAge: anomaly.user?.age ?? undefined,
        patientGender: anomaly.user?.gender ?? undefined,
      },
    });

    if (error) {
      console.error(
        `[surveillance-cron] Failed to create anomaly alert for diagnosis ${diagnosisId}:`,
        error,
      );
    } else {
      created++;
    }
  }

  return created;
}

async function processOutbreaks(supabase: any, outbreaks: any[]): Promise<number> {
  let created = 0;
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  for (const outbreak of outbreaks) {
    const { disease, district, severity, reasonCodes, message, metadata } =
      outbreak;

    // 24h dedup: check for existing OUTBREAK alert with same disease+district
    const { data: existing } = await supabase
      .from("Alert")
      .select("id")
      .eq("type", "OUTBREAK")
      .in("status", ["NEW", "ACKNOWLEDGED"])
      .eq("metadata->>disease", disease)
      .eq("metadata->>district", district ?? "")
      .gte("createdAt", oneDayAgo)
      .maybeSingle();

    if (existing) {
      console.log(
        `[surveillance-cron] Skipping duplicate outbreak alert for ${disease} in ${district}`,
      );
      continue;
    }

    const { error } = await supabase.from("Alert").insert({
      type: "OUTBREAK",
      severity,
      reasonCodes,
      message,
      metadata,
    });

    if (error) {
      console.error(
        `[surveillance-cron] Failed to create outbreak alert for ${disease} in ${district}:`,
        error,
      );
    } else {
      created++;
    }
  }

  return created;
}

function mapReasonCodesToSeverity(reasonCodes: string[]): string {
  if (
    reasonCodes.includes("GEOGRAPHIC:RARE") &&
    reasonCodes.includes("COMBINED:MULTI")
  ) {
    return "CRITICAL";
  }
  if (reasonCodes.includes("GEOGRAPHIC:RARE")) {
    return "HIGH";
  }
  if (
    reasonCodes.includes("COMBINED:MULTI") &&
    reasonCodes.length >= 3
  ) {
    return "HIGH";
  }
  if (
    reasonCodes.includes("CLUSTER:DENSE") ||
    reasonCodes.includes("OUTBREAK:VOL_SPIKE")
  ) {
    return "MEDIUM";
  }
  return "LOW";
}

function buildAlertMessage(
  disease: string,
  reasonCodes: string[],
  severity: string,
): string {
  const codeLabels: Record<string, string> = {
    "GEOGRAPHIC:RARE": "an occurrence in an unusual location",
    "TEMPORAL:RARE": "a presentation during an off-season period",
    "COMBINED:MULTI": "multiple overlapping anomalies",
    "AGE:RARE": "a patient age outside the typical demographic range",
    "GENDER:RARE": "a patient demographic that is uncommon for this disease",
  };

  let validLabels = reasonCodes
    .filter((c) => c !== "COMBINED:MULTI")
    .map((c) => codeLabels[c] ?? c);

  if (validLabels.length === 0 && reasonCodes.includes("COMBINED:MULTI")) {
    validLabels = [codeLabels["COMBINED:MULTI"]];
  }

  const formatter = new Intl.ListFormat("en", {
    style: "long",
    type: "conjunction",
  });
  const reasons =
    validLabels.length > 0
      ? formatter.format(validLabels)
      : "unrecognized anomalies";
  return `A ${severity.toLowerCase()}-priority ${disease} diagnosis requires attention. The case was flagged due to ${reasons}.`;
}
