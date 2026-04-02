# Implementation Verification Flowchart

```mermaid
flowchart TB
    subgraph Frontend["Frontend (Next.js)"]
        direction TB
        UI[User Interface<br/>DaisyUI Components]
        Actions[Server Actions<br/>next-safe-action]
        Prisma[Prisma ORM]
        Schema[(Prisma Schema)]
    end

    subgraph Backend["Backend (Flask)"]
        direction TB
        API[Flask API Endpoints]
        Services[Business Logic<br/>Services]
        ML[ML Models<br/>BioClinical-ModernBERT<br/>RoBERTa-Tagalog]
        Config[Config.py<br/>Thresholds]
    end

    subgraph Database["Database (PostgreSQL)"]
        direction TB
        DB[(Supabase PostgreSQL)]
        Tables[Tables: User, Diagnosis,<br/>Chat, Alert, etc.]
    end

    User --> UI
    UI --> Actions
    Actions --> Prisma
    Prisma --> DB
    
    UI -->|HTTP Request| API
    API --> Services
    Services --> ML
    Services --> Config
    API --> DB
    
    Schema -.->|generate| Prisma
    
    style Frontend fill:#e1f5fe,stroke:#01579b
    style Backend fill:#fff3e0,stroke:#e65100
    style Database fill:#e8f5e9,stroke:#1b5e20
```

## Verification Process Flowchart

```mermaid
flowchart TD
    Start([Start Verification]) --> TypeScript["Run TypeScript Check<br/>npx tsc --noEmit"]
    
    TypeScript --> TS_Error{Error?}
    
    TS_Error -->|Yes| Fix["Fix TypeScript Error<br/>Update diagnosis.ts<br/>Add missing fields"]
    Fix --> TypeScript
    
    TS_Error -->|No| Python["Check Python Compilation<br/>py_compile"]
    
    Python --> PY_Error{Error?}
    
    PY_Error -->|No| Build["Run Frontend Build<br/>npm run build"]
    
    PY_Error -->|Yes| FixPy["Fix Python Error"]
    FixPy --> Python
    
    Build --> Build_Error{Build Failed?}
    
    Build_Error -->|No| Schema["Verify Prisma Schema<br/>& Database Alignment"]
    
    Build_Error -->|Yes| FixBuild["Fix Build Error"]
    FixBuild --> Build
    
    Schema --> Config["Verify Config<br/>& Environment"]
    
    Config --> Complete([Verification Complete])
    
    style Start fill:#b3e5fc,stroke:#0277bd
    style Complete fill:#c8e6c9,stroke:#2e7d32
    style TS_Error fill:#ffcdd2,stroke:#c62828
    style PY_Error fill:#ffcdd2,stroke:#c62828
    style Build_Error fill:#ffcdd2,stroke:#c62828
```

## System Architecture Overview

```mermaid
flowchart LR
    subgraph Users
        Patient[Patient]
        Clinician[Clinician]
        Admin[Admin]
        Developer[Developer]
    end

    subgraph "AI'll Be Sick System"
        Frontend[Next.js<br/>Port 3000]
        Backend[Flask<br/>Port 10000]
        Database[PostgreSQL<br/>Supabase]
    end

    Patient -->|Submit Symptoms| Frontend
    Clinician -->|Verify/Override| Frontend
    Admin -->|Manage| Frontend
    Developer -->|Full Access| Frontend
    
    Frontend -->|API Calls| Backend
    Backend -->|ML Inference| Models
    Backend -->|Database Ops| Database
    Frontend -->|ORM Queries| Database
    
    style Users fill:#fce4ec,stroke:#880e4f
    style Frontend fill:#e3f2fd,stroke:#1565c0
    style Backend fill:#fff3e0,stroke:#e65100
    style Database fill:#e8f5e9,stroke:#1b5e20
```

## Role Hierarchy

```mermaid
flowchart TD
    DEVEL[DEVELOPER<br/>Level 3] --> ADMIN[ADMIN<br/>Level 2]
    ADMIN --> CLINICIAN[CLINICIAN<br/>Level 1]
    CLINICIAN --> PATIENT[PATIENT<br/>Level 0]
    
    DEVEL -.->|Inherits all| PATIENT
    ADMIN -.->|Inherits| PATIENT
    CLINICIAN -.->|Inherits| PATIENT
    
    style DEVEL fill:#ff8a80,stroke:#c62828
    style ADMIN fill:#ffcc80,stroke:#ef6c00
    style CLINICIAN fill:#ffff80,stroke:#f9a825
    style PATIENT fill:#b9f6ca,stroke:#2e7d32