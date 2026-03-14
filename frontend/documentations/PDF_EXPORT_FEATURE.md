# PDF Export Feature

## Overview

The PDF Export feature enables users to generate professional, downloadable PDF reports from data tables throughout the application. This feature is particularly valuable for clinicians and healthcare professionals who need to export patient data, diagnosis histories, and user reports for record-keeping, analysis, or sharing purposes.

### Purpose

- **Data Portability**: Allow users to export tabular data in a universally readable format
- **Professional Reporting**: Generate clean, formatted PDF documents suitable for professional use
- **Offline Access**: Enable users to save and access data without requiring application access
- **Compliance & Documentation**: Support healthcare documentation requirements

### Target Users

- **Clinicians**: Export healthcare reports, user data, and surveillance information
- **Patients**: Export personal diagnosis history for personal records or second opinions
- **Administrators**: Generate reports for analysis, auditing, or regulatory compliance

### Key Benefits

- **One-Click Export**: Simple, accessible export functionality integrated into existing data tables
- **Professional Formatting**: Clean, readable PDF layout with proper headers and data organization
- **Flexible Data Coverage**: Export filtered and sorted data as displayed in the UI
- **Client-Side Generation**: Fast PDF creation without server round-trips

---

## How It Works

### Core Functionality

The PDF export feature uses the `jspdf` and `jspdf-autotable` libraries to generate PDF documents directly in the browser. The feature consists of three main components:

1. **Export Button Component** (`ExportPdfButton`): A reusable UI component that triggers PDF generation
2. **PDF Export Utilities** (`pdf-export.ts`): Helper functions and type definitions for PDF configuration
3. **Data Table Integration**: Enhanced data tables that accept export configuration props

### User Flow

```
┌─────────────────┐
│  User views     │
│  data table     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  User clicks    │
│  "Export PDF"   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  PDF generated  │
│  client-side    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Download       │
│  initiated      │
└─────────────────┘
```

### User Interaction Steps

1. **Navigate to Data Page**: User accesses a page with tabular data (e.g., Healthcare Reports, Users, Diagnosis History)
2. **Apply Filters (Optional)**: User can filter, sort, or search to refine the data set
3. **Click Export Button**: User clicks the "Export PDF" button located in the table controls
4. **Automatic Download**: PDF is generated and downloaded to the user's device with the configured filename

### System Integration

The PDF export feature integrates seamlessly with existing components:

- **Data Tables**: Enhanced with `additionalActions` prop to accept export button
- **Type System**: Uses TypeScript interfaces for type-safe column and data definitions
- **Styling**: Follows DaisyUI design system for consistent appearance
- **Data Layer**: Works with data fetched via Prisma and server actions

---

## Implementation

### Technical Requirements

**Dependencies:**
```json
{
  "jspdf": "^4.2.0",
  "jspdf-autotable": "^5.0.7"
}
```

**Browser Support:**
- Modern browsers with ES6+ support
- Requires Blob API support for download functionality

### Architecture

#### Component Structure

```
frontend/
├── components/
│   └── ui/
│       └── export-pdf-button.tsx    # Reusable export button component
├── utils/
│   └── pdf-export.ts                # Type definitions and utilities
└── app/
    └── (app)/
        ├── (clinician)/
        │   ├── healthcare-reports/  # Export implementation
        │   └── users/               # Export implementation
        └── (patient)/
            └── history/             # Export implementation
```

### Core Components

#### 1. ExportPdfButton Component

**Location**: `frontend/components/ui/export-pdf-button.tsx`

The main reusable component that handles PDF generation and download.

**Key Features:**
- Accepts structured data and column definitions
- Configurable filename, title, and subtitle
- Client-side PDF generation using jsPDF
- AutoTable integration for formatted table output

**Usage Pattern:**
```tsx
<ExportPdfButton
  data={exportData}
  columns={pdfColumns}
  filename="report-name"
  title="Report Title"
  subtitle="Report subtitle or description"
/>
```

#### 2. PDF Column Definition

**Location**: `frontend/utils/pdf-export.ts`

Type-safe column configuration for PDF tables:

```typescript
export interface PdfColumn {
  header: string;      // Display name in PDF header
  dataKey: string;     // Key to access data from row object
}
```

#### 3. Data Table Enhancement

All data table components have been enhanced with an `additionalActions` prop:

```typescript
interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  additionalActions?: React.ReactNode;  // New prop for export button
}
```

### Code Examples

#### Example 1: Healthcare Reports Export

```tsx
// frontend/app/(app)/(clinician)/healthcare-reports/page.tsx

const pdfColumns: PdfColumn[] = [
  { header: "Disease", dataKey: "disease" },
  { header: "Confidence", dataKey: "confidence" },
  { header: "Uncertainty", dataKey: "uncertainty" },
  { header: "Symptoms", dataKey: "symptoms" },
  { header: "Patient ID", dataKey: "userId" },
  { header: "Date", dataKey: "createdAt" },
];

const exportData = (diagnoses || []).map((d) => ({
  disease: d.disease,
  confidence: `${(d.confidence * 100).toFixed(2)}%`,
  uncertainty: `${(d.uncertainty * 100).toFixed(2)}%`,
  symptoms: d.symptoms,
  userId: d.userId,
  createdAt: new Date(d.createdAt),
}));

return (
  <DataTable 
    columns={columns} 
    data={diagnoses || []}
    additionalActions={
      <ExportPdfButton
        data={exportData}
        columns={pdfColumns}
        filename="healthcare-reports"
        title="Healthcare Reports"
        subtitle="All diagnoses in the system"
      />
    }
  />
);
```

#### Example 2: Users Report Export

```tsx
// frontend/app/(app)/(clinician)/users/page.tsx

const pdfColumns: PdfColumn[] = [
  { header: "Name", dataKey: "name" },
  { header: "Email", dataKey: "email" },
  { header: "Gender", dataKey: "gender" },
  { header: "Age", dataKey: "age" },
  { header: "Region", dataKey: "region" },
  { header: "Role", dataKey: "role" },
  { header: "Diagnoses", dataKey: "diagnoses" },
  { header: "Joined", dataKey: "createdAt" },
];

const exportData = (users || []).map((user) => ({
  name: user.name || "-",
  email: user.email,
  gender: user.gender || "-",
  age: user.age ?? "-",
  region: [user.city, user.region].filter(Boolean).join(", ") || "-",
  role: user.role,
  diagnoses: user._count.diagnoses,
  createdAt: new Date(user.createdAt),
}));

return (
  <DataTable 
    columns={columns} 
    data={users || []} 
    currentUserRole={currentUserRole}
    additionalActions={
      <ExportPdfButton
        data={exportData}
        columns={pdfColumns}
        filename="users-report"
        title="Users Report"
        subtitle="All registered users"
      />
    }
  />
);
```

#### Example 3: Patient Diagnosis History Export

```tsx
// frontend/app/(app)/(patient)/history/page.tsx

const pdfColumns: PdfColumn[] = [
  { header: "Diagnosis", dataKey: "diagnosis" },
  { header: "Model", dataKey: "modelUsed" },
  { header: "Uncertainty", dataKey: "uncertainty" },
  { header: "Confidence", dataKey: "confidence" },
  { header: "Date", dataKey: "createdAt" },
];

const exportData = rows.map((row) => ({
  diagnosis: row.diagnosis,
  modelUsed: row.modelUsed || "-",
  uncertainty: row.uncertainty !== null 
    ? `${(row.uncertainty * 100).toFixed(2)}%` 
    : "-",
  confidence: row.confidence !== null 
    ? `${(row.confidence * 100).toFixed(2)}%` 
    : "-",
  createdAt: new Date(row.createdAt),
}));

return (
  <DataTable 
    columns={columns} 
    data={rows}
    additionalActions={
      <ExportPdfButton
        data={exportData}
        columns={pdfColumns}
        filename="diagnosis-history"
        title="Diagnosis History"
        subtitle="Your diagnosis history"
      />
    }
  />
);
```

### Data Transformation Patterns

#### Date Handling

All dates are converted to JavaScript `Date` objects before export. jsPDF AutoTable handles the formatting automatically:

```typescript
createdAt: new Date(d.createdAt)
```

#### Percentage Formatting

Confidence and uncertainty values (stored as decimals) are formatted as percentages:

```typescript
confidence: `${(d.confidence * 100).toFixed(2)}%`
```

#### Null Handling

Use fallback values for optional fields to ensure clean PDF output:

```typescript
name: user.name || "-",
age: user.age ?? "-",
region: [user.city, user.region].filter(Boolean).join(", ") || "-"
```

---

## Configuration

### PDF Generation Options

The `ExportPdfButton` component accepts the following props:

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `data` | `Array<Record<string, any>>` | Yes | Array of data objects to export |
| `columns` | `PdfColumn[]` | Yes | Column definitions with header and dataKey |
| `filename` | `string` | Yes | Base filename for downloaded PDF (without extension) |
| `title` | `string` | Yes | Main title displayed at top of PDF |
| `subtitle` | `string` | No | Subtitle or description below main title |

### PdfColumn Interface

```typescript
interface PdfColumn {
  /** Display text in table header */
  header: string;
  
  /** Object key to access data from each row */
  dataKey: string;
}
```

### Customization Options

Future enhancements could include:

- **Page Orientation**: Portrait vs landscape layout
- **Font Size**: Adjustable text sizing for different data volumes
- **Color Schemes**: Theme-aware styling matching application theme
- **Logo Inclusion**: Add organization branding to reports
- **Page Breaks**: Control over how tables span multiple pages

---

## Reference

### File Locations

| File | Purpose |
|------|---------|
| `frontend/components/ui/export-pdf-button.tsx` | Main export button component |
| `frontend/utils/pdf-export.ts` | Type definitions and utilities |
| `frontend/app/(app)/(clinician)/healthcare-reports/page.tsx` | Healthcare reports export |
| `frontend/app/(app)/(clinician)/users/page.tsx` | Users report export |
| `frontend/app/(app)/(patient)/history/page.tsx` | Diagnosis history export |
| `frontend/components/*/data-table.tsx` | Enhanced data table components |

### Dependencies

- **jsPDF** (`^4.2.0`): PDF document generation library
- **jsPDF-AutoTable** (`^5.0.7`): Table plugin for jsPDF

### API Reference

#### ExportPdfButton Props

```typescript
interface ExportPdfButtonProps {
  data: Record<string, any>[];
  columns: PdfColumn[];
  filename: string;
  title: string;
  subtitle?: string;
}
```

#### Data Table Props (Enhanced)

```typescript
interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  additionalActions?: React.ReactNode;  // For export button
}
```

---

## Error Handling

### Common Issues and Solutions

#### Issue: PDF Not Downloading

**Symptoms**: Button click produces no visible result

**Possible Causes:**
- Browser popup blocker preventing download
- JavaScript error in PDF generation

**Solutions:**
- Check browser console for errors
- Allow popups/downloads for the site
- Verify data format matches column definitions

#### Issue: Incorrect Data in PDF

**Symptoms**: PDF shows wrong or missing data

**Possible Causes:**
- Mismatch between `dataKey` and actual object keys
- Data transformation errors

**Solutions:**
- Verify column `dataKey` values match data object keys
- Check data transformation logic for null/undefined handling
- Test with sample data before deployment

#### Issue: Performance with Large Datasets

**Symptoms**: Slow PDF generation or browser freezing

**Solutions:**
- Implement pagination or data limits for export
- Consider server-side PDF generation for very large datasets
- Add loading indicator during generation

---

## Performance Considerations

### Client-Side Generation

**Advantages:**
- No server load or API calls
- Immediate feedback to user
- Works offline after initial page load

**Limitations:**
- Browser memory constraints for large datasets
- Performance varies by device capability
- Not suitable for extremely large reports (>1000 rows)

### Best Practices

1. **Limit Export Size**: Consider pagination or date range limits
2. **Optimize Data**: Transform and filter data before passing to export
3. **User Feedback**: Add loading states for large exports
4. **Test Performance**: Verify acceptable performance with realistic data volumes

---

## Testing Guidelines

### Manual Testing Checklist

- [ ] Export button appears in correct location
- [ ] PDF downloads with correct filename
- [ ] All columns appear in correct order
- [ ] Data formatting matches UI display
- [ ] Dates format correctly in PDF
- [ ] Null/undefined values display as "-"
- [ ] Title and subtitle appear correctly
- [ ] Long text wraps appropriately
- [ ] Multi-page tables render correctly
- [ ] Works with empty data sets (graceful handling)

### Test Scenarios

#### Scenario 1: Standard Export
**Steps:**
1. Navigate to Healthcare Reports page
2. Click "Export PDF"
3. Verify PDF downloads with all diagnoses

**Expected**: PDF with complete data, proper formatting

#### Scenario 2: Filtered Export
**Steps:**
1. Apply filters to data table
2. Click "Export PDF"
3. Verify only filtered data appears in PDF

**Expected**: PDF contains only visible/filtered data

#### Scenario 3: Large Dataset
**Steps:**
1. Navigate to Users page with many users
2. Click "Export PDF"
3. Verify PDF generation completes in reasonable time

**Expected**: PDF generates within 5 seconds for <500 rows

---

## Future Enhancements

### Planned Features

1. **Export Format Options**: Add CSV, Excel export capabilities
2. **Custom Date Ranges**: Allow users to select date ranges for export
3. **Column Selection**: Let users choose which columns to include
4. **Email Integration**: Send PDF directly via email
5. **Scheduled Exports**: Automated periodic report generation
6. **Template System**: Pre-configured report templates for common use cases

### Technical Improvements

- **Streaming Generation**: For very large datasets
- **Server-Side Rendering**: For consistent formatting and performance
- **Progress Indicators**: Show generation progress for large exports
- **Print Optimization**: CSS print styles for browser print functionality

---

## Related Features

- **Data Tables**: Core table components with sorting, filtering, pagination
- **Alerts System**: Notification system that can trigger report generation
- **User Management**: Role-based access to export functionality
- **Date Range Filters**: Filter data before export for targeted reports

---

## Appendix: Complete Implementation Example

### Creating a New Export-Enabled Page

```tsx
// 1. Define columns
const pdfColumns: PdfColumn[] = [
  { header: "Column 1", dataKey: "field1" },
  { header: "Column 2", dataKey: "field2" },
];

// 2. Transform data
const exportData = data.map((item) => ({
  field1: item.field1,
  field2: item.field2,
}));

// 3. Add to DataTable
<DataTable
  columns={tableColumns}
  data={data}
  additionalActions={
    <ExportPdfButton
      data={exportData}
      columns={pdfColumns}
      filename="my-report"
      title="My Report"
      subtitle="Description of report"
    />
  }
/>
```

---

**Document Version**: 1.0  
**Last Updated**: March 14, 2026  
**Maintainer**: Development Team
