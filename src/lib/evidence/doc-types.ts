// Client-safe evidence constants (no Node imports), shared by the upload UI and the server rules in files.ts.
export const DOC_TYPES = {
  invoice: "Tax invoice",
  fuel_bill: "Fuel bill / issue slip",
  electricity_bill: "Electricity bill",
  log_book: "Log book / meter reading",
  delivery_challan: "Delivery challan",
  weighbridge_slip: "Weighbridge slip",
  ticket: "Travel ticket",
  hotel_invoice: "Hotel invoice",
  refill_report: "Refrigerant / SF6 service report",
  waste_manifest: "Waste manifest",
  certificate: "Certificate (REC, test, EPD)",
  other: "Other",
} as const;
export type DocType = keyof typeof DOC_TYPES;

// Must match the extensions checkFile() accepts.
export const ACCEPT = ".pdf,.png,.jpg,.jpeg,.webp,.heic,.xlsx,.docx,.xls,.doc,.csv";
