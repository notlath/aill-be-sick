/**
 * Symptom checklist options organized by body system.
 *
 * Each symptom's `phrase` is derived from the `positive_symptom` values in the
 * question banks (`question_bank.json` / `question_bank_tagalog.json`) so the
 * generated text closely matches what the NLP models were trained on.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SymptomOption = {
  /** Unique stable identifier (used as checkbox value). */
  id: string;
  /** User-facing label shown next to the checkbox. */
  label: { en: string; tl: string };
  /** Clinical phrase template fed to the NLP model when checked. */
  phrase: { en: string; tl: string };
};

export type SymptomCategory = {
  id: string;
  /** Section heading shown above the group of checkboxes. */
  title: { en: string; tl: string };
  /** Optional helper text beneath the heading. */
  description?: { en: string; tl: string };
  symptoms: SymptomOption[];
};

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

export const SYMPTOM_CATEGORIES: SymptomCategory[] = [
  // ── General / Constitutional ──────────────────────────────────────────
  {
    id: "general",
    title: { en: "General", tl: "Pangkalahatan" },
    description: {
      en: "Whole-body symptoms like fever, fatigue, or chills",
      tl: "Mga sintomas sa buong katawan tulad ng lagnat, pagod, o panginginig",
    },
    symptoms: [
      {
        id: "high_fever",
        label: { en: "High fever", tl: "Mataas na lagnat" },
        phrase: {
          en: "I have an extremely high fever and feel like I am burning up",
          tl: "Mayroon akong mataas na lagnat",
        },
      },
      {
        id: "mild_fever",
        label: { en: "Mild or low-grade fever", tl: "Bahagyang lagnat" },
        phrase: {
          en: "I only have a mild fever or feel slightly warm",
          tl: "Mayroon akong lagnat o tumaas na temperatura ng katawan",
        },
      },
      {
        id: "chills_shivering",
        label: { en: "Chills or shivering", tl: "Panginginig o ginaw" },
        phrase: {
          en: "I have a fever with sweating and shivering chills",
          tl: "Nakakaranas ako ng panginginig o pakiramdam na sobrang lamig",
        },
      },
      {
        id: "fatigue_weakness",
        label: {
          en: "Fatigue or weakness",
          tl: "Pagod o panghihina",
        },
        phrase: {
          en: "I feel overwhelmingly exhausted and weak",
          tl: "Nakakaramdam ako ng hindi pangkaraniwang pagod o panghihina",
        },
      },
      {
        id: "body_aches",
        label: { en: "Body or muscle aches", tl: "Pananakit ng katawan" },
        phrase: {
          en: "I have sore muscles and body aches all over",
          tl: "Nakakaranas ako ng matinding pananakit ng kalamnan o katawan",
        },
      },
      {
        id: "loss_of_appetite",
        label: {
          en: "Loss of appetite",
          tl: "Nawalan ng gana kumain",
        },
        phrase: {
          en: "I have completely lost my appetite and feel exhausted",
          tl: "Nawalan ako ng gana kumain",
        },
      },
      {
        id: "sudden_onset",
        label: {
          en: "Symptoms started suddenly",
          tl: "Bigla ang pagsimula ng sintomas",
        },
        phrase: {
          en: "My symptoms and fever hit me very suddenly",
          tl: "Bigla ang pagsimula ng aking mga sintomas na may lagnat",
        },
      },
      {
        id: "gradual_onset",
        label: {
          en: "Symptoms built up over several days",
          tl: "Unti-unting lumala sa ilang araw",
        },
        phrase: {
          en: "My symptoms started slowly and got worse over many days",
          tl: "Unti-unti ang pagsimula ng aking mga sintomas",
        },
      },
    ],
  },

  // ── Head & Neurological ───────────────────────────────────────────────
  {
    id: "head",
    title: { en: "Head & Neurological", tl: "Ulo at Neurologikal" },
    description: {
      en: "Headache, eye pain, dizziness, or confusion",
      tl: "Sakit ng ulo, pananakit ng mata, pagkahilo, o pagkalito",
    },
    symptoms: [
      {
        id: "severe_headache",
        label: { en: "Severe or pounding headache", tl: "Matinding sakit ng ulo" },
        phrase: {
          en: "I have a severe, pounding headache",
          tl: "Nakaranas ako ng pananakit ng ulo",
        },
      },
      {
        id: "pain_behind_eyes",
        label: { en: "Pain behind the eyes", tl: "Pananakit sa likod ng mata" },
        phrase: {
          en: "I have severe pain behind my eyes",
          tl: "Nakakaranas ako ng pananakit sa mata o sa likod ng aking mga mata",
        },
      },
      {
        id: "confusion",
        label: { en: "Confusion or brain fog", tl: "Pagkalito o malabong pag-iisip" },
        phrase: {
          en: "I feel confused, disoriented, or foggy",
          tl: "Nahihirapan ako sa pag-iisip o nalilito",
        },
      },
    ],
  },

  // ── Respiratory ───────────────────────────────────────────────────────
  {
    id: "respiratory",
    title: { en: "Respiratory", tl: "Paghinga" },
    description: {
      en: "Cough, breathing problems, or throat symptoms",
      tl: "Ubo, problema sa paghinga, o sintomas sa lalamunan",
    },
    symptoms: [
      {
        id: "dry_cough",
        label: { en: "Dry or hacking cough", tl: "Tuyong ubo" },
        phrase: {
          en: "I have a dry, hacking cough",
          tl: "Mayroon akong tuyo at paulit-ulit na ubo",
        },
      },
      {
        id: "wet_cough",
        label: {
          en: "Cough with thick or colored phlegm",
          tl: "Ubo na may makapal na plema",
        },
        phrase: {
          en: "I have a wet cough bringing up thick or colored phlegm",
          tl: "Umuubo ako ng plema o sipon",
        },
      },
      {
        id: "shortness_of_breath",
        label: {
          en: "Shortness of breath or difficulty breathing",
          tl: "Hirap sa paghinga",
        },
        phrase: {
          en: "I am experiencing shortness of breath or difficulty breathing",
          tl: "Nahihirapan ako sa paghinga, kulang sa hininga, o mabilis ang paghinga",
        },
      },
      {
        id: "chest_pain_breathing",
        label: {
          en: "Chest pain when breathing or coughing",
          tl: "Pananakit ng dibdib kapag humihinga",
        },
        phrase: {
          en: "I have sharp chest pain when breathing deeply or coughing",
          tl: "Nakakaranas ako ng pananakit ng dibdib o hindi komportable sa dibdib",
        },
      },
      {
        id: "sore_throat",
        label: { en: "Sore or scratchy throat", tl: "Masakit na lalamunan" },
        phrase: {
          en: "I have a sore or scratchy throat",
          tl: "Masakit ang aking lalamunan",
        },
      },
      {
        id: "runny_stuffy_nose",
        label: { en: "Runny or stuffy nose", tl: "Sipon o baradong ilong" },
        phrase: {
          en: "I have a runny or stuffy nose",
          tl: "Mayroon akong sipon o baradong ilong",
        },
      },
    ],
  },

  // ── Digestive ─────────────────────────────────────────────────────────
  {
    id: "digestive",
    title: { en: "Digestive", tl: "Panunaw" },
    description: {
      en: "Stomach pain, nausea, diarrhea, or bowel changes",
      tl: "Sakit ng tiyan, pagduduwal, pagtatae, o pagbabago sa dumi",
    },
    symptoms: [
      {
        id: "nausea_vomiting",
        label: { en: "Nausea or vomiting", tl: "Pagduduwal o pagsusuka" },
        phrase: {
          en: "I have experienced nausea or vomiting",
          tl: "Nakaranas ako ng pagduduwal o pagsusuka",
        },
      },
      {
        id: "diarrhea_watery",
        label: {
          en: "Diarrhea (frequent watery stools)",
          tl: "Pagtatae (madalas na matubig na dumi)",
        },
        phrase: {
          en: "My symptoms started suddenly with frequent watery stools",
          tl: "Madalas akong dumumi ng matubig o malabnaw",
        },
      },
      {
        id: "stomach_cramps",
        label: {
          en: "Stomach cramps or abdominal pain",
          tl: "Pulikat o sakit ng tiyan",
        },
        phrase: {
          en: "I am experiencing severe abdominal cramping and twisting pain in my gut",
          tl: "Nakakaranas ako ng sakit ng tiyan o pulikat",
        },
      },
      {
        id: "constipation",
        label: { en: "Constipation", tl: "Hirap sa pagtae" },
        phrase: {
          en: "I am experiencing severe constipation or diarrhea",
          tl: "Nahihirapan ako sa pagtae o nakakaranas ng constipation",
        },
      },
      {
        id: "dehydration",
        label: {
          en: "Signs of dehydration (thirst, dry mouth, low urine)",
          tl: "Senyales ng dehydration (uhaw, tuyong bibig)",
        },
        phrase: {
          en: "I feel very thirsty, have a dry mouth, and signs of dehydration like low urine output",
          tl: "Nakakaramdam ako ng uhaw, tuyong bibig, o dehydrated",
        },
      },
      {
        id: "blood_in_stool",
        label: {
          en: "Blood in stool",
          tl: "Dugo sa dumi",
        },
        phrase: {
          en: "I have noticed blood or red streaks in my stool",
          tl: "Napansin ko na may dugo sa aking dumi",
        },
      },
    ],
  },

  // ── Skin & Eyes ───────────────────────────────────────────────────────
  {
    id: "skin_eyes",
    title: { en: "Skin & Eyes", tl: "Balat at Mata" },
    description: {
      en: "Rashes, spots, bleeding, or eye symptoms",
      tl: "Pantal, spot, pagdurugo, o sintomas sa mata",
    },
    symptoms: [
      {
        id: "rash_red_spots",
        label: {
          en: "Rash of tiny red spots on skin",
          tl: "Pantal na maliliit na pulang spot sa balat",
        },
        phrase: {
          en: "I have a rash of tiny red spots on my skin",
          tl: "Mayroon akong pantal o pulang spot sa aking balat",
        },
      },
      {
        id: "rash_spreading_face",
        label: {
          en: "Rash spreading from face or head downward",
          tl: "Pantal na kumakalat mula sa mukha pababa",
        },
        phrase: {
          en: "I have a rash that started on my head or face and is spreading downwards",
          tl: "Mayroon akong pantal na nagsimula sa aking mukha",
        },
      },
      {
        id: "rose_spots_torso",
        label: {
          en: "Faint pink or rose spots on chest or stomach",
          tl: "Mapusyaw na rosas na spot sa dibdib o tiyan",
        },
        phrase: {
          en: "I have small pink or red spots on my stomach or chest",
          tl: "Mayroon akong pantal sa dibdib o tiyan",
        },
      },
      {
        id: "bleeding_gums_nose",
        label: {
          en: "Bleeding gums or nosebleed",
          tl: "Pagdurugo ng gilagid o ilong",
        },
        phrase: {
          en: "I have noticed mild bleeding like a nosebleed or bleeding gums",
          tl: "Nakapansin ako ng pamumula ng balat o namamagang bahagi",
        },
      },
      {
        id: "red_watery_eyes",
        label: {
          en: "Red, watery, or light-sensitive eyes",
          tl: "Pula, lumuluha, o sensitibo sa liwanag na mata",
        },
        phrase: {
          en: "My eyes are very red, watery, and sensitive to light",
          tl: "Namumula o nagluluha ang aking mga mata",
        },
      },
      {
        id: "white_spots_mouth",
        label: {
          en: "Tiny white spots inside the mouth",
          tl: "Maliliit na puting spot sa loob ng bibig",
        },
        phrase: {
          en: "I have noticed tiny white spots inside my mouth on my cheeks",
          tl: "Napansin ko ang maliliit na puting spot sa loob ng aking bibig",
        },
      },
    ],
  },
];

/**
 * Flat list of every symptom for quick ID lookup.
 */
export const ALL_SYMPTOMS: SymptomOption[] = SYMPTOM_CATEGORIES.flatMap(
  (cat) => cat.symptoms,
);

/**
 * Minimum number of symptoms required before the checklist can be submitted.
 */
export const MIN_CHECKED_SYMPTOMS = 2;
