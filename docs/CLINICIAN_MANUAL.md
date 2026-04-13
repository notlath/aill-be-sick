# Clinician User Manual

A quick guide to the AI'll Be Sick clinician dashboard for healthcare professionals.

> **Note:** This dashboard provides disease surveillance tools. AI predictions are decision-support aids and should not replace clinical judgment.

---

## Getting Started

Log in at the clinician login page using your authorized credentials. First-time users must accept the terms of service.

**Sidebar Navigation:**

- **Overview** - Dashboard with illness pattern analysis
- **Alerts** - Real-time anomaly notifications
- **Disease Map** - Geographic visualization of cases
- **Users** - Patient and clinician directory
- **Healthcare Reports** - All diagnosis records
- **Profile** - Your account settings
- **Help** - Reopen the clinician guide
- **Sign Out** - Log out

---

## Overview (Dashboard)

The main dashboard shows **Illness Patterns** - groups of similar diagnoses based on patient details.

**Features:**

- **Simple setup first** - Use the **Recommended** preset for a quick baseline (age + district + diagnosis date)
- **Advanced options toggle** - Click **Show advanced options** only when you need more control
- **Variable sections** - Advanced options are organized into **Demographics**, **Clinical**, and **Temporal**
- **Quick help** - Use the **?** beside "Select variables" for plain-language guidance
- **Date range filter** - Choose all time, recent ranges, or a custom range
- **Recommended group count** - The dashboard shows a suggested number of groups
- **Manual group count (advanced)** - Set groups manually when advanced options are enabled (2-25)
- **Overview cards** - Review summary details for each group
- **Map shortcut** - Open a group directly on the map from each card

Click **Apply** after making changes.

---

## Usability Test Scenarios for Illness Groups

Use these quick scenarios with busy, non-technical healthcare workers. Ask them to think out loud, and record completion time, errors, and confidence.

### 1) Basic mode (preset + quick date)

**Steps:**

- Open **Overview**.
- Keep **Recommended** preset.
- Pick a quick date range (for example, last 7 days).
- Click **Apply**.

**Expected outcome:**

- The user completes setup in under 30 seconds.
- The dashboard shows refreshed group cards without extra guidance.
- The user can explain what changed in plain words.

### 2) Advanced options toggle

**Steps:**

- Start in basic mode.
- Turn on **Show advanced options**.
- Select at least one extra variable.
- Turn advanced options off again.

**Expected outcome:**

- The user understands the toggle controls optional settings.
- The user can return to a simple setup without confusion.
- No critical action is blocked when advanced options are off.

### 3) Top 5 + Other groups behavior

**Steps:**

- Run grouping with enough data to produce more than 5 groups.
- Review the cards and map shortcut links.

**Expected outcome:**

- The user sees top groups clearly first.
- Smaller groups are combined into **Other** and still understandable.
- The user can open a selected group on the map and verify the same context.

### 4) Recommended vs manual group count behavior

**Steps:**

- Run with recommended count.
- Turn on advanced options and set a manual count (for example, 4 then 8).
- Re-run after each change.

**Expected outcome:**

- The user understands recommended count is the default starting point.
- Manual count changes are visible in card totals and composition.
- The user can pick a count that supports their current review task.

### 5) Readability and decision speed (time-to-insight)

**Steps:**

- Give a realistic prompt: “Find where attention is needed today.”
- Start timer when the page loads.
- Stop timer when the user states a clear next action.

**Expected outcome:**

- Time-to-insight is under 2 minutes for most participants.
- The user can identify one priority area and one follow-up action.
- Labels and card summaries are readable without technical translation.

## Alerts

View real-time notifications about unusual disease patterns or potential outbreaks.

**Features:**

- **Tabs** - Filter by All, Unread, or Read alerts
- **Alert cards** - Show type, severity, affected area, and timestamp
- **Mark read/unread** - Toggle alert status
- **View details** - Click an alert to see full information
- **Add notes** - Document clinician observations
- **Export PDF** - Download alert details

The badge in the sidebar shows your unread alert count.

---

## Disease Map

Visualize disease data geographically with three view modes:

**By Disease** - Shows case distribution by district for a selected disease

**By Group** - Displays geographic patient groups from the grouping analysis

**By Anomaly** - Highlights areas with unusual disease activity

**Controls:**

- **View selector** - Switch between the three modes
- **Disease filter** - Focus on a specific condition
- **Date range** - Filter cases by time period
- **Click on areas** - View patient lists for that location

---

## Users

Browse all registered users in the system.

**Features:**

- **Search** - Find users by name or email
- **Filter by role** - Show Admin, Clinician, or Patient accounts
- **Sort columns** - Click headers to sort
- **Export PDF** - Download the user list
- **Add Clinician** (Admin only) - Invite new clinician accounts via email

---

## Healthcare Reports

View all recorded diagnoses in the system.

**Features:**

- **Search** - Find by patient name, disease, or symptoms
- **Filter by disease** - Show only specific conditions
- **Filter by date** - Narrow down by time range
- **Filter by reliability** - Show High, Moderate, or Low reliability results
- **Sort columns** - Click headers to reorder
- **Export PDF** - Download the report data
- **View details** - Click a row to see the full diagnosis report including symptoms, AI confidence, and reliability score

---

## Profile

Manage your clinician account settings.

**Options:**

- Update your name and avatar
- Change your email (requires verification)
- Update your password

---

## Need Help?

- Click the **Help** button in the sidebar to reopen the clinician guide
- For technical issues, contact your system administrator

---

_AI predictions are decision-support tools. Always apply clinical judgment when reviewing results._
