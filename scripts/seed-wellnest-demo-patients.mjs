#!/usr/bin/env node
/**
 * Seed (or upsert) the 3 Wellnest demo patients into Airtable Patients table.
 *
 * Why:
 * - `wellnest-demo-*` rows in src/debug are session-only.
 * - This script creates real Patients rows so treatment-plan edits persist.
 *
 * Required env:
 * - AIRTABLE_API_KEY   (Personal access token with base/table write access)
 * - AIRTABLE_BASE_ID   (e.g. appXXXXXXXXXXXXXX)
 * - WELLNEST_PROVIDER_ID (record id from Providers table, e.g. recXXXXXXXXXXXXXX)
 *
 * Optional env:
 * - AIRTABLE_PATIENTS_TABLE (defaults to "Patients")
 *
 * Usage:
 *   AIRTABLE_API_KEY=... AIRTABLE_BASE_ID=... WELLNEST_PROVIDER_ID=... \
 *   node scripts/seed-wellnest-demo-patients.mjs
 */

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const WELLNEST_PROVIDER_ID = process.env.WELLNEST_PROVIDER_ID;
const PATIENTS_TABLE = process.env.AIRTABLE_PATIENTS_TABLE || "Patients";

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID || !WELLNEST_PROVIDER_ID) {
  console.error(
    "Missing required env vars: AIRTABLE_API_KEY, AIRTABLE_BASE_ID, WELLNEST_PROVIDER_ID",
  );
  process.exit(1);
}

const AIRTABLE_API = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(
  PATIENTS_TABLE,
)}`;

const NOW = new Date().toISOString();

function buildDemoPatients() {
  return [
    {
      name: "Alex Rivera",
      email: "wellnest-demo-alex@demo.wellnest.local",
      phone: "+1 555 201 4401",
      goals: ["Recovery", "Training support"],
      interestedIssues: "Tendon recovery, workout inflammation, gut comfort",
      discussedItems: [
        {
          id: "wellnest-d1",
          treatment: "BPC-157",
          interest: "Recovery support",
          timeline: "Now",
          product: "SC injection preferred",
          quantity: "1",
          notes: "5-week supply discussed",
        },
        {
          id: "wellnest-d2",
          treatment: "Thymosin Beta-4 (TB-500)",
          interest: "Recovery support",
          timeline: "Add next visit",
          product: "SC injection preferred",
          quantity: "1",
        },
        {
          id: "wellnest-d3",
          treatment: "CJC-1295",
          interest: "Energy & recovery",
          timeline: "Wishlist",
          product: "SC injection",
          quantity: "1",
        },
      ],
      wellnessQuiz: {
        version: 1,
        completedAt: NOW,
        answers: {},
        suggestedTreatmentIds: ["bpc-157", "tb-500", "cjc-1295"],
      },
    },
    {
      name: "Jordan Lee",
      email: "wellnest-demo-jordan@demo.wellnest.local",
      phone: "+1 555 201 4402",
      goals: ["Sleep", "Focus", "Stress balance"],
      interestedIssues: "Brain fog, stress, sleep latency",
      discussedItems: [
        {
          id: "wellnest-d4",
          treatment: "Semax",
          interest: "Cognitive clarity",
          timeline: "Now",
          product: "Nasal spray available",
          quantity: "1",
        },
        {
          id: "wellnest-d5",
          treatment: "Selank",
          interest: "Stress balance",
          timeline: "Add next visit",
          product: "SC injection ideal",
          quantity: "1",
        },
        {
          id: "wellnest-d6",
          treatment: "Ipamorelin",
          interest: "Sleep & muscle",
          timeline: "Wishlist",
          product: "SC injection only",
          quantity: "1",
        },
      ],
      wellnessQuiz: {
        version: 1,
        completedAt: NOW,
        answers: {},
        suggestedTreatmentIds: ["semax", "selank", "ipamorelin"],
      },
    },
    {
      name: "Taylor Morgan",
      email: "wellnest-demo-taylor@demo.wellnest.local",
      phone: "+1 555 201 4403",
      goals: ["Body composition", "Metabolic support"],
      interestedIssues: "Visceral fat, joint comfort, bone health",
      discussedItems: [
        {
          id: "wellnest-d7",
          treatment: "Tesamorelin",
          interest: "Metabolic wellness",
          timeline: "Now",
          product: "SC injection",
          quantity: "1",
        },
        {
          id: "wellnest-d8",
          treatment: "AOD-9604",
          interest: "Metabolic wellness",
          timeline: "Add next visit",
          product: "SC injection",
          quantity: "1",
        },
        {
          id: "wellnest-d9",
          treatment: "Cartalax",
          interest: "Joint support",
          timeline: "Wishlist",
          product: "SC injection",
          quantity: "1",
        },
        {
          id: "wellnest-d10",
          treatment: "MK-677",
          interest: "Bone & joint",
          timeline: "Wishlist",
          product: "SC injection",
          quantity: "1",
        },
      ],
      wellnessQuiz: {
        version: 1,
        completedAt: NOW,
        answers: {},
        suggestedTreatmentIds: ["tesamorelin", "aod-9604", "cartalax", "mk-677"],
      },
    },
  ];
}

function headers() {
  return {
    Authorization: `Bearer ${AIRTABLE_API_KEY}`,
    "Content-Type": "application/json",
  };
}

async function fetchByEmail(email) {
  const formula = `{Email} = "${email.replace(/"/g, '\\"')}"`;
  const url = `${AIRTABLE_API}?maxRecords=1&filterByFormula=${encodeURIComponent(formula)}`;
  const res = await fetch(url, { headers: headers() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message || `Airtable fetch failed: HTTP ${res.status}`);
  }
  return data.records?.[0] ?? null;
}

function buildFields(p) {
  return {
    Name: p.name,
    Email: p.email,
    "Patient Phone Number": p.phone,
    Source: "Patients",
    Status: "Scheduled",
    Archived: false,
    Notes: "Wellnest demo patient (Airtable-seeded for persistent testing).",
    Providers: [WELLNEST_PROVIDER_ID],
    "Treatments Discussed": JSON.stringify(p.discussedItems),
    "Wellness Quiz": JSON.stringify(p.wellnessQuiz),
    Goals: p.goals,
    "Aesthetic Goals": p.interestedIssues,
  };
}

async function createRecord(fields) {
  const res = await fetch(AIRTABLE_API, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ fields }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message || `Airtable create failed: HTTP ${res.status}`);
  }
  return data;
}

async function updateRecord(recordId, fields) {
  const res = await fetch(`${AIRTABLE_API}/${recordId}`, {
    method: "PATCH",
    headers: headers(),
    body: JSON.stringify({ fields }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message || `Airtable update failed: HTTP ${res.status}`);
  }
  return data;
}

async function run() {
  const patients = buildDemoPatients();
  let created = 0;
  let updated = 0;
  for (const p of patients) {
    const existing = await fetchByEmail(p.email);
    const fields = buildFields(p);
    if (existing?.id) {
      await updateRecord(existing.id, fields);
      updated += 1;
      console.log(`Updated: ${p.name} (${existing.id})`);
    } else {
      const rec = await createRecord(fields);
      created += 1;
      console.log(`Created: ${p.name} (${rec.id})`);
    }
  }
  console.log(`Done. created=${created} updated=${updated}`);
}

run().catch((err) => {
  console.error("Seed failed:", err?.message || err);
  process.exit(1);
});

