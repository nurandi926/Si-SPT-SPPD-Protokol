/**
 * Service untuk Integrasi Langsung dengan Google Sheets API v4
 * Menggunakan access token resmi dari Firebase Auth Google Provider
 */

export interface SpreadsheetInfo {
  id: string;
  title: string;
  url: string;
  sheetNames: string[];
}

/**
 * Ekstrak ID spreadsheet dari input yang bisa berupa ID langsung atau URL Google Sheets
 */
export function extractSpreadsheetId(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
}

/**
 * Membuat Dokumen Spreadsheet Baru di Google Drive Akun yang Login
 */
export async function createSpreadsheet(
  title: string,
  accessToken: string
): Promise<SpreadsheetInfo> {
  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: title || 'Rekap SPT & SPD Prokopim Lumajang',
      },
      sheets: [
        {
          properties: {
            title: 'Rekap SPT',
            gridProperties: {
              frozenRowCount: 1,
            },
          },
        },
      ],
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(
      errData?.error?.message || `Gagal membuat Google Spreadsheet (HTTP ${response.status})`
    );
  }

  const data = await response.json();
  const id = data.spreadsheetId;
  const sheetNames = (data.sheets || []).map((s: any) => s.properties?.title || 'Sheet1');

  return {
    id,
    title: data.properties?.title || title,
    url: `https://docs.google.com/spreadsheets/d/${id}/edit`,
    sheetNames,
  };
}

/**
 * Mengambil informasi spreadsheet dan daftar sheet tab yang ada
 */
export async function getSpreadsheetDetails(
  spreadsheetId: string,
  accessToken: string
): Promise<SpreadsheetInfo> {
  const id = extractSpreadsheetId(spreadsheetId);
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${id}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(
      errData?.error?.message || `Gagal mengakses spreadsheet (${response.status}). Periksa izin akses.`
    );
  }

  const data = await response.json();
  const sheetNames = (data.sheets || []).map((s: any) => s.properties?.title || 'Sheet1');

  return {
    id,
    title: data.properties?.title || 'Spreadsheet',
    url: `https://docs.google.com/spreadsheets/d/${id}/edit`,
    sheetNames,
  };
}

/**
 * Update isi sheet secara utuh (menulis ulang baris data & header)
 */
export async function updateSheetValues(
  spreadsheetId: string,
  range: string,
  values: any[][],
  accessToken: string
): Promise<{ updatedCells: number; updatedRows: number }> {
  const id = extractSpreadsheetId(spreadsheetId);
  const encodedRange = encodeURIComponent(range);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${encodedRange}?valueInputOption=USER_ENTERED`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values,
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(
      errData?.error?.message || `Gagal memperbarui data sheet (${response.status})`
    );
  }

  const data = await response.json();
  return {
    updatedCells: data.updatedCells || 0,
    updatedRows: data.updatedRows || 0,
  };
}

/**
 * Menambahkan baris baru ke spreadsheet (Append)
 */
export async function appendSheetValues(
  spreadsheetId: string,
  range: string,
  values: any[][],
  accessToken: string
): Promise<{ updatedRows: number }> {
  const id = extractSpreadsheetId(spreadsheetId);
  const encodedRange = encodeURIComponent(range);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${encodedRange}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values,
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(
      errData?.error?.message || `Gagal menambah baris ke sheet (${response.status})`
    );
  }

  const data = await response.json();
  return {
    updatedRows: data.updates?.updatedRows || values.length,
  };
}
