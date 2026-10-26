import { GoogleSheetSyncRow } from '@/types';
import { formatIDR, formatWIB, formatTo62Phone } from './formatters';

export { formatIDR, formatWIB, formatTo62Phone };

// In-memory sync log for tracking row numbers & fallback simulation
export interface SheetSyncRecord {
  order_code: string;
  row_number: number;
  timestamp: string;
  data: GoogleSheetSyncRow;
  status: 'SUCCESS' | 'FAILED' | 'SIMULATED';
}

declare global {
  // eslint-disable-next-line no-var
  var __BGN_SHEET_LOGS__: SheetSyncRecord[] | undefined;
}

if (!global.__BGN_SHEET_LOGS__) {
  global.__BGN_SHEET_LOGS__ = [];
}

export function getSheetSyncLogs(): SheetSyncRecord[] {
  return global.__BGN_SHEET_LOGS__ || [];
}

// Google Sheets API client loader using dynamic import
async function getGoogleSheetsClient() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (!clientEmail || !privateKey || !spreadsheetId) {
    return null;
  }

  try {
    const { google } = await import('googleapis');
    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    return { sheets, spreadsheetId };
  } catch (err) {
    console.warn('[Google Sheets] Client init error:', err);
    return null;
  }
}

// Append new settlement row to Google Sheets with 3x retry
export async function appendToGoogleSheet(
  row: GoogleSheetSyncRow
): Promise<{ success: boolean; rowNumber: number; isSimulated: boolean; error?: string }> {
  const client = await getGoogleSheetsClient();
  const logs = global.__BGN_SHEET_LOGS__ || [];
  const simulatedRowNumber = logs.length + 2; // header is row 1

  // If Google credentials are not set, record in simulated log
  if (!client) {
    logs.push({
      order_code: row.transaction_id,
      row_number: simulatedRowNumber,
      timestamp: new Date().toISOString(),
      data: row,
      status: 'SIMULATED',
    });
    return { success: true, rowNumber: simulatedRowNumber, isSimulated: true };
  }

  const values = [
    [
      row.transaction_id,
      row.timestamp_wib,
      row.customer_name,
      row.contact,
      row.items_summary,
      row.gross_amount_formatted,
      row.payment_method,
      row.mdr_fee_formatted,
      row.net_revenue_formatted,
      row.order_status,
    ],
  ];

  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    attempts++;
    try {
      const response = await client.sheets.spreadsheets.values.append({
        spreadsheetId: client.spreadsheetId,
        range: 'Sheet1!A:J',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values },
      });

      const updatedRange = response.data.updates?.updatedRange || '';
      const match = updatedRange.match(/!A(\d+)/);
      const rowNumber = match ? parseInt(match[1], 10) : simulatedRowNumber;

      logs.push({
        order_code: row.transaction_id,
        row_number: rowNumber,
        timestamp: new Date().toISOString(),
        data: row,
        status: 'SUCCESS',
      });

      return { success: true, rowNumber, isSimulated: false };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.warn(`[Google Sheets] Attempt ${attempts} failed: ${errorMsg}`);
      if (attempts >= maxAttempts) {
        logs.push({
          order_code: row.transaction_id,
          row_number: simulatedRowNumber,
          timestamp: new Date().toISOString(),
          data: row,
          status: 'FAILED',
        });
        return {
          success: false,
          rowNumber: simulatedRowNumber,
          isSimulated: false,
          error: errorMsg,
        };
      }
      await new Promise((res) => setTimeout(res, attempts * 300));
    }
  }

  return { success: false, rowNumber: simulatedRowNumber, isSimulated: false };
}

// Update column 10 (Status Pesanan) when order is completed
export async function updateGoogleSheetOrderStatus(
  rowNumber: number,
  orderCode: string,
  newStatus: string
): Promise<{ success: boolean; isSimulated: boolean }> {
  const client = await getGoogleSheetsClient();
  const logs = global.__BGN_SHEET_LOGS__ || [];
  const logRecord = logs.find((l) => l.order_code === orderCode || l.row_number === rowNumber);
  if (logRecord) {
    logRecord.data.order_status = newStatus;
  }

  if (!client) {
    return { success: true, isSimulated: true };
  }

  try {
    await client.sheets.spreadsheets.values.update({
      spreadsheetId: client.spreadsheetId,
      range: `Sheet1!J${rowNumber}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[newStatus]],
      },
    });
    return { success: true, isSimulated: false };
  } catch (err) {
    console.error(`[Google Sheets] Error updating row J${rowNumber}:`, err);
    return { success: false, isSimulated: false };
  }
}
