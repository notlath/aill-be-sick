import type { DiseaseValue } from "@/constants/diseases";
import type {
  DiseaseVerificationProtocol,
  DiseaseVerificationSymptom,
} from "@/types/clinical-verification";

const PROTOCOL_VERSION = "2026-04-13";

const SHARED_SOURCES = [
  "DOH / PSMID / PIDSP-aligned symptom protocol derived from the verified follow-up questionnaire",
  "docs/QUESTIONNAIRE_VERIFICATION_REPORT.md",
  "backend/question_bank.json",
  "backend/question_bank_tagalog.json",
];

const symptom = (
  id: string,
  questionId: string,
  role: DiseaseVerificationSymptom["role"],
  en: string,
  tl: string,
): DiseaseVerificationSymptom => ({
  id,
  questionId,
  role,
  labels: { en, tl },
});

const createProtocol = (
  disease: DiseaseValue,
  diseaseName: string,
  minRequiredCount: number,
  minCoreCount: number,
  coreSymptoms: DiseaseVerificationSymptom[],
  supportingSymptoms: DiseaseVerificationSymptom[],
  contradictionSymptoms: DiseaseVerificationSymptom[],
): DiseaseVerificationProtocol => ({
  disease,
  diseaseName,
  minRequiredCount,
  minCoreCount,
  protocolVersion: PROTOCOL_VERSION,
  sources: SHARED_SOURCES,
  coreSymptoms,
  supportingSymptoms,
  contradictionSymptoms,
});

export const CLINICAL_VERIFICATION_PROTOCOLS: Record<
  DiseaseValue,
  DiseaseVerificationProtocol
> = {
  DENGUE: createProtocol(
    "DENGUE",
    "Dengue",
    4,
    2,
    [
      symptom(
        "high_fever",
        "dengue_q1",
        "core",
        "Extremely high fever",
        "Napakataas na lagnat",
      ),
      symptom(
        "severe_body_aches",
        "dengue_q2",
        "core",
        "Severe muscle or body aches",
        "Matinding pananakit ng kalamnan o katawan",
      ),
      symptom(
        "pain_behind_eyes",
        "dengue_q3",
        "core",
        "Pain behind the eyes",
        "Pananakit sa likod ng mga mata",
      ),
      symptom(
        "mild_bleeding",
        "dengue_q4",
        "core",
        "Unusual mild bleeding, such as gums or nosebleed",
        "Di-pangkaraniwang bahagyang pagdurugo, tulad ng gilagid o nosebleed",
      ),
      symptom(
        "rash_red_spots",
        "dengue_q5",
        "core",
        "Rash with tiny red spots",
        "Pantal na may maliliit na pulang tuldok",
      ),
    ],
    [
      symptom(
        "severe_headache",
        "dengue_q6",
        "supporting",
        "Severe headache",
        "Matinding sakit ng ulo",
      ),
      symptom(
        "nausea_vomiting",
        "dengue_q7",
        "supporting",
        "Nausea or vomiting",
        "Pagduduwal o pagsusuka",
      ),
      symptom(
        "extreme_fatigue",
        "dengue_q8",
        "supporting",
        "Overwhelming fatigue or weakness",
        "Matinding pagkapagod o panghihina",
      ),
      symptom(
        "stiff_sore_joints",
        "dengue_q9",
        "supporting",
        "Stiff or sore joints",
        "Paninigas o pananakit ng mga kasukasuan",
      ),
    ],
    [
      symptom(
        "cough_or_runny_nose",
        "dengue_q10",
        "contradiction",
        "Cough or runny nose",
        "Ubo o sipon",
      ),
    ],
  ),
  PNEUMONIA: createProtocol(
    "PNEUMONIA",
    "Pneumonia",
    4,
    2,
    [
      symptom(
        "colored_phlegm",
        "pneumonia_q1",
        "core",
        "Wet cough with thick or colored phlegm",
        "Ubo na may makapal o may kulay na plema",
      ),
      symptom(
        "chest_pain_breathing",
        "pneumonia_q2",
        "core",
        "Sharp chest pain when breathing or coughing",
        "Matalim na pananakit ng dibdib kapag humihinga o umuubo",
      ),
      symptom(
        "shortness_of_breath",
        "pneumonia_q3",
        "core",
        "Shortness of breath or difficulty breathing",
        "Hirap sa paghinga o kapos ang hininga",
      ),
      symptom(
        "fever_with_chills",
        "pneumonia_q4",
        "core",
        "Persistent fever with chills or shivering",
        "Tuloy-tuloy na lagnat na may panginginig",
      ),
    ],
    [
      symptom(
        "extreme_weakness",
        "pneumonia_q6",
        "supporting",
        "Extreme weakness or no energy",
        "Matinding panghihina o walang lakas",
      ),
      symptom(
        "body_aches",
        "pneumonia_q7",
        "supporting",
        "Body or muscle aches",
        "Pananakit ng katawan o kalamnan",
      ),
      symptom(
        "nausea_vomiting",
        "pneumonia_q8",
        "supporting",
        "Nausea or vomiting",
        "Pagduduwal o pagsusuka",
      ),
      symptom(
        "persistent_headache",
        "pneumonia_q9",
        "supporting",
        "Persistent headache",
        "Tuloy-tuloy na sakit ng ulo",
      ),
      symptom(
        "worse_lying_down",
        "pneumonia_q10",
        "supporting",
        "Breathing gets worse when lying down",
        "Mas lumalala ang paghinga kapag nakahiga",
      ),
    ],
    [
      symptom(
        "runny_nose",
        "pneumonia_q5",
        "contradiction",
        "Runny nose or sniffles",
        "Sipon o pagsinga",
      ),
    ],
  ),
  TYPHOID: createProtocol(
    "TYPHOID",
    "Typhoid",
    4,
    2,
    [
      symptom(
        "prolonged_fever",
        "typhoid_q1",
        "core",
        "Fever lasting many days and getting worse",
        "Lagnat na tumatagal nang maraming araw at lumalala",
      ),
      symptom(
        "abdominal_tenderness",
        "typhoid_q2",
        "core",
        "Stomach tenderness or cramping",
        "Pananakit o paninikip ng tiyan",
      ),
      symptom(
        "bowel_change",
        "typhoid_q3",
        "core",
        "Constipation or loose stools",
        "Constipation o maluwag na pagdumi",
      ),
      symptom(
        "rose_spots",
        "typhoid_q4",
        "core",
        "Faint pink or rose spots on the chest or stomach",
        "Maputlang rosas o pulang pantal sa dibdib o tiyan",
      ),
      symptom(
        "gradual_onset",
        "typhoid_q9",
        "core",
        "Symptoms started gradually over several days",
        "Unti-unting nagsimula ang mga sintomas sa loob ng ilang araw",
      ),
    ],
    [
      symptom(
        "relative_bradycardia",
        "typhoid_q5",
        "supporting",
        "Pulse feels unusually slow despite fever",
        "Parang mabagal ang tibok ng puso kahit may lagnat",
      ),
      symptom(
        "frontal_headache",
        "typhoid_q6",
        "supporting",
        "Constant frontal headache",
        "Tuloy-tuloy na pananakit sa harap ng ulo",
      ),
      symptom(
        "appetite_loss_exhaustion",
        "typhoid_q7",
        "supporting",
        "Loss of appetite with exhaustion",
        "Walang gana kumain at matinding pagkapagod",
      ),
      symptom(
        "brain_fog",
        "typhoid_q8",
        "supporting",
        "Confusion or brain fog",
        "Pagkalito o malabong pag-iisip",
      ),
    ],
    [
      symptom(
        "severe_cough_breathing",
        "typhoid_q10",
        "contradiction",
        "Severe cough or breathing problems",
        "Matinding ubo o problema sa paghinga",
      ),
    ],
  ),
  DIARRHEA: createProtocol(
    "DIARRHEA",
    "Diarrhea",
    3,
    1,
    [
      symptom(
        "watery_stools",
        "diarrhea_q1",
        "core",
        "Frequent watery or loose stools",
        "Madalas na matubig o malabnaw na dumi",
      ),
      symptom(
        "severe_cramps",
        "diarrhea_q2",
        "core",
        "Severe stomach cramps",
        "Matinding pulikat o pananakit ng tiyan",
      ),
      symptom(
        "dehydration_signs",
        "diarrhea_q3",
        "core",
        "Signs of dehydration",
        "Mga palatandaan ng dehydration",
      ),
      symptom(
        "blood_in_stool",
        "diarrhea_q4",
        "core",
        "Blood or red streaks in the stool",
        "Dugo o mapulang guhit sa dumi",
      ),
    ],
    [
      symptom(
        "nausea_vomiting",
        "diarrhea_q7",
        "supporting",
        "Nausea or vomiting",
        "Pagduduwal o pagsusuka",
      ),
      symptom(
        "fluid_loss_weakness",
        "diarrhea_q8",
        "supporting",
        "Extreme weakness from fluid loss",
        "Matinding panghihina dahil sa pagkawala ng tubig sa katawan",
      ),
      symptom(
        "mild_fever",
        "diarrhea_q9",
        "supporting",
        "Mild fever",
        "Bahagyang lagnat",
      ),
      symptom(
        "bowel_urgency",
        "diarrhea_q10",
        "supporting",
        "Sudden uncontrollable urge to use the bathroom",
        "Biglaang matinding pagnanais na dumumi",
      ),
    ],
    [
      symptom(
        "respiratory_symptoms",
        "diarrhea_q5",
        "contradiction",
        "Cough, runny nose, or breathing difficulty",
        "Ubo, sipon, o hirap sa paghinga",
      ),
      symptom(
        "prolonged_worsening_fever",
        "diarrhea_q6",
        "contradiction",
        "High fever lasting and getting worse for over a week",
        "Mataas na lagnat na tumatagal at lumalala nang mahigit isang linggo",
      ),
    ],
  ),
  MEASLES: createProtocol(
    "MEASLES",
    "Measles",
    4,
    2,
    [
      symptom(
        "spreading_rash",
        "measles_q1",
        "core",
        "Rash that started on the face and spread downward",
        "Pantal na nagsimula sa mukha at kumalat pababa",
      ),
      symptom(
        "fever_and_dry_cough",
        "measles_q2",
        "core",
        "High fever with a persistent dry cough",
        "Mataas na lagnat na may tuloy-tuloy na tuyong ubo",
      ),
      symptom(
        "red_watery_eyes",
        "measles_q3",
        "core",
        "Red, watery, light-sensitive eyes",
        "Namumula, nagluluha, at sensitibo sa liwanag ang mga mata",
      ),
      symptom(
        "prodrome_before_rash",
        "measles_q4",
        "core",
        "Fever, cough, and runny nose started before the rash",
        "Nauna ang lagnat, ubo, at sipon bago ang pantal",
      ),
      symptom(
        "constant_runny_nose",
        "measles_q5",
        "core",
        "Constant runny nose",
        "Tuloy-tuloy na sipon",
      ),
    ],
    [
      symptom(
        "koplik_spots",
        "measles_q6",
        "supporting",
        "Tiny white spots inside the mouth",
        "Maliliit na puting spot sa loob ng bibig",
      ),
      symptom(
        "complete_exhaustion",
        "measles_q8",
        "supporting",
        "Complete exhaustion",
        "Matinding pagkapagod",
      ),
      symptom(
        "sore_throat",
        "measles_q9",
        "supporting",
        "Sore throat",
        "Masakit na lalamunan",
      ),
      symptom(
        "mild_diarrhea",
        "measles_q10",
        "supporting",
        "Mild diarrhea",
        "Bahagyang pagtatae",
      ),
    ],
    [
      symptom(
        "bleeding_or_bone_pain",
        "measles_q7",
        "contradiction",
        "Unusual bleeding or severe deep bone pain",
        "Di-pangkaraniwang pagdurugo o matinding pananakit ng buto",
      ),
    ],
  ),
  INFLUENZA: createProtocol(
    "INFLUENZA",
    "Influenza",
    4,
    2,
    [
      symptom(
        "sudden_onset",
        "influenza_q1",
        "core",
        "Symptoms started suddenly",
        "Biglang nagsimula ang mga sintomas",
      ),
      symptom(
        "dry_hacking_cough",
        "influenza_q2",
        "core",
        "Persistent dry or hacking cough",
        "Tuloy-tuloy na tuyong o paulit-ulit na ubo",
      ),
      symptom(
        "body_aches_all_over",
        "influenza_q3",
        "core",
        "Body aches all over",
        "Pananakit ng katawan sa kabuuan",
      ),
      symptom(
        "extreme_fatigue",
        "influenza_q4",
        "core",
        "Extreme tiredness or exhaustion",
        "Matinding pagod o panghihina",
      ),
      symptom(
        "dry_nonproductive_cough",
        "influenza_q9",
        "core",
        "Cough stays dry and does not bring up colored phlegm",
        "Nananatiling tuyo ang ubo at walang may kulay na plema",
      ),
      symptom(
        "breathing_fine",
        "influenza_q10",
        "core",
        "Breathing is fine and there is no sharp chest pain",
        "Maayos ang paghinga at walang matalim na pananakit ng dibdib",
      ),
    ],
    [
      symptom(
        "headache",
        "influenza_q5",
        "supporting",
        "Headache",
        "Sakit ng ulo",
      ),
      symptom(
        "scratchy_throat",
        "influenza_q6",
        "supporting",
        "Sore or scratchy throat",
        "Masakit o makating lalamunan",
      ),
      symptom(
        "runny_stuffy_nose",
        "influenza_q7",
        "supporting",
        "Runny or stuffy nose",
        "Sipon o baradong ilong",
      ),
    ],
    [
      symptom(
        "rash_or_pain_behind_eyes",
        "influenza_q8",
        "contradiction",
        "Skin rash or pain behind the eyes",
        "Pantal sa balat o pananakit sa likod ng mga mata",
      ),
    ],
  ),
};

export const normalizeDiseaseValue = (value: string): DiseaseValue | null => {
  const normalized = value.trim().toUpperCase().replace(/\s+/g, "_");
  if (normalized in CLINICAL_VERIFICATION_PROTOCOLS) {
    return normalized as DiseaseValue;
  }
  return null;
};

export const getClinicalVerificationProtocol = (
  disease: string,
): DiseaseVerificationProtocol | null => {
  const normalized = normalizeDiseaseValue(disease);
  return normalized ? CLINICAL_VERIFICATION_PROTOCOLS[normalized] : null;
};

let cachedSymptomMap: Record<string, string> | null = null;

export const getSymptomLabelMap = (): Record<string, string> => {
  if (cachedSymptomMap) return cachedSymptomMap;
  
  const map: Record<string, string> = {};
  Object.values(CLINICAL_VERIFICATION_PROTOCOLS).forEach((protocol) => {
    const allSymptoms = [
      ...protocol.coreSymptoms,
      ...protocol.supportingSymptoms,
      ...protocol.contradictionSymptoms,
    ];
    
    allSymptoms.forEach((s) => {
      // Use English label by default
      map[s.questionId] = s.labels.en;
    });
  });
  
  cachedSymptomMap = map;
  return map;
};
