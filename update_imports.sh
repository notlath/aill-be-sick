#!/bin/bash

# 1. Update columns.tsx
sed -i 's/export function getAnonymizedPatientId(userId: number): string {/\/\/ Function moved to @\/utils\/patient.ts/g' frontend/components/clinicians/healthcare-reports-page/columns.tsx
sed -i 's/  const hash = Math.abs(userId \* 2654435761) % 100000;//g' frontend/components/clinicians/healthcare-reports-page/columns.tsx
sed -i 's/  return `P-\${hash.toString().padStart(5, "0")}`;//g' frontend/components/clinicians/healthcare-reports-page/columns.tsx
sed -i 's/}/\/\/ }/g' frontend/components/clinicians/healthcare-reports-page/columns.tsx

