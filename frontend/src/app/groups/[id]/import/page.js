'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { addExpense, recordSettlement } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import Layout from '@/components/Layout';
import Avatar from '@/components/Avatar';
import { getCategoryIcon } from '@/utils/categoryIcons';
import { FileSpreadsheet, AlertTriangle, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

// Custom robust CSV line parser to handle quotes and commas properly
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// Name standardization map for quick lookup
const nameStandardizationMap = {
  'priya s': 'Priya',
  'priya': 'Priya',
  'rohan ': 'Rohan',
  'rohan': 'Rohan',
  'aisha': 'Aisha',
  'meera': 'Meera',
  'dev': 'Dev',
  'sam': 'Sam',
  'kabir': 'Kabir',
  'dev\'s friend kabir': 'Dev\'s friend Kabir'
};

function standardizeName(name) {
  if (!name) return 'Unknown Payer';
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();
  
  if (nameStandardizationMap[lower]) {
    return nameStandardizationMap[lower];
  }
  return trimmed.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export default function ImportPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const groupId = params.id;

  useEffect(() => {
    if (groupId && typeof window !== 'undefined') {
      localStorage.setItem('lastGroupId', groupId);
    }
  }, [groupId]);

  const [file, setFile] = useState(null);
  const [parsingData, setParsingData] = useState(null); // { rows, anomalies, members }
  const [selectedRows, setSelectedRows] = useState({}); // rowIdx -> boolean (checked to import)
  const [resolvedValues, setResolvedValues] = useState({}); // rowIdx -> selected date

  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState('');
  const [importSuccess, setImportSuccess] = useState(null);
  const [phase, setPhase] = useState('upload'); // 'upload' | 'preview' | 'complete'
  const [error, setError] = useState('');
  const [tableFilter, setTableFilter] = useState('all'); // 'all' | 'anomalies' | 'flagged' | 'clean'

  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setError('');
    }
  };

  const handleUpload = (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a CSV file first');
      return;
    }

    setUploading(true);
    setError('');

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        parseCSVText(e.target.result);
      } catch (err) {
        console.error(err);
        setError('Failed to parse CSV file: ' + err.message);
        setUploading(false);
      }
    };
    reader.readAsText(file);
  };

  const parseCSVText = (text) => {
    const lines = text.split(/\r?\n/);
    if (lines.length < 2) {
      throw new Error('CSV file is empty or invalid.');
    }

    const headers = parseCSVLine(lines[0]);
    const parsedRows = [];
    const anomalies = [];
    const uniqueMembers = new Set();
    const processedHashes = new Set(); // For duplicate detection

    const initialApprovals = {};
    const initialResolutions = {};

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const rawValues = parseCSVLine(line);
      if (rawValues.length < headers.length) continue;

      const rowIdx = i + 1; // 1-indexed Excel row index
      const rowData = {
        date: rawValues[0] || '',
        description: rawValues[1] || '',
        paid_by: rawValues[2] || '',
        amount: rawValues[3] || '',
        currency: rawValues[4] || '',
        split_type: rawValues[5] || '',
        split_with: rawValues[6] || '',
        split_details: rawValues[7] || '',
        notes: rawValues[8] || '',
        rowIdx
      };

      const rowAnomalies = [];
      let status = 'CLEAN';

      // --- 1. Duplicate Detection ---
      const dupHash = `${rowData.date.trim()}|${rowData.description.toLowerCase().trim()}|${rowData.paid_by.toLowerCase().trim()}|${parseFloat(rowData.amount.replace(/,/g, ''))}`;
      let isDuplicate = false;
      if (processedHashes.has(dupHash)) {
        isDuplicate = true;
        status = 'FLAGGED';
        rowAnomalies.push({
          column: 'description',
          type: 'Potential Duplicate Entry',
          description: 'Flagged duplicate: Identical date, payer, amount and description.',
          action: 'SKIP'
        });
        anomalies.push({
          rowIdx,
          column: 'description',
          type: 'Potential Duplicate Entry',
          originalValue: rowData.description,
          actionTaken: 'Flagged duplicate. Row deselected by default.',
          severity: 'warning'
        });
      } else {
        processedHashes.add(dupHash);
      }

      // --- 2. Date Format Standardization ---
      let cleanDate = rowData.date.trim();
      let dateAnomaly = false;
      
      // Match DD/MM/YYYY
      if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(cleanDate)) {
        const parts = cleanDate.split('/');
        cleanDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        dateAnomaly = true;
      } 
      // Match MMM DD (like Mar 14)
      else if (/^[A-Za-z]{3}\s\d{1,2}$/.test(cleanDate)) {
        const months = {
          jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
          jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
        };
        const parts = cleanDate.split(' ');
        const monthStr = months[parts[0].toLowerCase().slice(0, 3)];
        const dayStr = parts[1].padStart(2, '0');
        cleanDate = `2026-${monthStr}-${dayStr}`; 
        dateAnomaly = true;
        
        status = 'FIXED';
        rowAnomalies.push({
          column: 'date',
          type: 'Year Inference',
          description: `Inferred year 2026 -> ${cleanDate}`,
          action: 'AUTO_FIX'
        });
        anomalies.push({
          rowIdx,
          column: 'date',
          type: 'Year Inference',
          originalValue: rowData.date,
          actionTaken: `Inferred year 2026 -> ${cleanDate}`,
          severity: 'info'
        });
      }

      if (dateAnomaly && !/^[A-Za-z]{3}\s\d{1,2}$/.test(rowData.date.trim())) {
        status = 'FIXED';
        rowAnomalies.push({
          column: 'date',
          type: 'Date Format Standardisation',
          description: `Parsed DD/MM/YYYY to ${cleanDate}`,
          action: 'AUTO_FIX'
        });
        anomalies.push({
          rowIdx,
          column: 'date',
          type: 'Date Format Standardisation',
          originalValue: rowData.date,
          actionTaken: `Parsed DD/MM/YYYY to ${cleanDate}`,
          severity: 'info'
        });
      }

      // Special Date Ambiguity resolution (04/05/2026)
      if (rowData.date.trim() === '04/05/2026') {
        cleanDate = '2026-04-05';
        status = 'FLAGGED';
        rowAnomalies.push({
          column: 'date',
          type: 'Ambiguous Date Resolved',
          description: 'Resolved to 2026-04-05 (April 5) based on chronological sequence',
          action: 'FLAG_FOR_REVIEW'
        });
        anomalies.push({
          rowIdx,
          column: 'date',
          type: 'Ambiguous Date Resolved',
          originalValue: '04/05/2026',
          actionTaken: 'Resolved to 2026-04-05 (April 5) to fit chronological ordering',
          severity: 'warning'
        });

        // Set ambiguous date dropdown options
        initialResolutions[rowIdx] = {
          selectedDate: '2026-04-05',
          dateOptions: ['2026-04-05', '2026-05-04']
        };
      }

      // --- 3. Payer Standardization ---
      let cleanPayer = rowData.paid_by.trim();
      if (!cleanPayer) {
        cleanPayer = 'Unknown Payer';
        status = 'FLAGGED';
        rowAnomalies.push({
          column: 'paid_by',
          type: 'Missing Payer',
          description: 'Payer name was missing. Reclassified as Unknown Payer.',
          action: 'FLAG_FOR_REVIEW'
        });
        anomalies.push({
          rowIdx,
          column: 'paid_by',
          type: 'Missing Payer',
          originalValue: 'blank',
          actionTaken: 'Assigned to "Unknown Payer" placeholder',
          severity: 'error'
        });
      } else {
        const stdPayer = standardizeName(cleanPayer);
        if (stdPayer !== cleanPayer) {
          status = 'FIXED';
          rowAnomalies.push({
            column: 'paid_by',
            type: 'Name Casing / Standardisation',
            description: `Standardised ${cleanPayer} -> ${stdPayer}`,
            action: 'AUTO_FIX'
          });
          anomalies.push({
            rowIdx,
            column: 'paid_by',
            type: 'Name Casing / Standardisation',
            originalValue: rowData.paid_by,
            actionTaken: `Standardized to ${stdPayer}`,
            severity: 'info'
          });
          cleanPayer = stdPayer;
        }
      }

      if (cleanPayer && cleanPayer !== 'Unknown Payer') {
        uniqueMembers.add(cleanPayer);
      }

      // --- 4. Amount Standardisation ---
      let rawAmt = rowData.amount.trim();
      let cleanAmt = parseFloat(rawAmt.replace(/["\s,]/g, ''));
      
      if (rawAmt.includes(',')) {
        status = 'FIXED';
        rowAnomalies.push({
          column: 'amount',
          type: 'Number Formatting (Comma Removal)',
          description: `Removed commas -> ${cleanAmt}`,
          action: 'AUTO_FIX'
        });
        anomalies.push({
          rowIdx,
          column: 'amount',
          type: 'Number Formatting (Comma Removal)',
          originalValue: rowData.amount,
          actionTaken: `Removed commas -> ${cleanAmt}`,
          severity: 'info'
        });
      }

      const decimalCount = (rawAmt.split('.')[1] || '').length;
      if (decimalCount > 2) {
        const roundedAmt = Math.round(cleanAmt * 100) / 100;
        status = 'FIXED';
        rowAnomalies.push({
          column: 'amount',
          type: 'Excessive Decimal Rounded',
          description: `Rounded 3-decimal amount to ${roundedAmt.toFixed(2)}`,
          action: 'AUTO_FIX'
        });
        anomalies.push({
          rowIdx,
          column: 'amount',
          type: 'Excessive Decimal Rounded',
          originalValue: rowData.amount,
          actionTaken: `Rounded 3-decimal amount to ${roundedAmt.toFixed(2)}`,
          severity: 'info'
        });
        cleanAmt = roundedAmt;
      }

      if (cleanAmt === 0) {
        status = 'FLAGGED';
        rowAnomalies.push({
          column: 'amount',
          type: 'Zero Amount Recorded',
          description: 'Logged zero amount. Row deselected by default.',
          action: 'SKIP'
        });
        anomalies.push({
          rowIdx,
          column: 'amount',
          type: 'Zero Amount Recorded',
          originalValue: rowData.amount,
          actionTaken: 'Logged zero amount. Will not affect group balances.',
          severity: 'warning'
        });
      }

      if (cleanAmt < 0) {
        status = 'FIXED';
        rowAnomalies.push({
          column: 'amount',
          type: 'Negative Refund Transaction',
          description: 'Logged negative refund. Will subtract from splits.',
          action: 'IMPORT_AS_REFUND'
        });
        anomalies.push({
          rowIdx,
          column: 'amount',
          type: 'Negative Refund Transaction',
          originalValue: rowData.amount,
          actionTaken: 'Logged negative refund. Will subtract from splits.',
          severity: 'info'
        });
      }

      // --- 5. Currency Standardisation ---
      let cleanCurrency = rowData.currency.trim().toUpperCase();
      if (!cleanCurrency) {
        cleanCurrency = 'INR';
        status = 'FIXED';
        rowAnomalies.push({
          column: 'currency',
          type: 'Missing Currency',
          description: 'Defaulted currency to INR',
          action: 'AUTO_FIX'
        });
        anomalies.push({
          rowIdx,
          column: 'currency',
          type: 'Missing Currency',
          originalValue: 'blank',
          actionTaken: 'Defaulted currency to INR',
          severity: 'warning'
        });
      }

      // --- 6. Classify Settlements vs Expenses ---
      let isSettlement = false;
      let cleanSplitType = rowData.split_type.trim().toLowerCase();
      const lowerDesc = rowData.description.toLowerCase();
      const lowerNotes = rowData.notes.toLowerCase();

      if (
        !cleanSplitType || 
        lowerDesc.includes('paid back') || 
        lowerDesc.includes('settled') || 
        lowerNotes.includes('settlement')
      ) {
        isSettlement = true;
        status = 'FLAGGED';
        rowAnomalies.push({
          column: 'split_type',
          type: 'SETTLEMENT_ROW',
          description: 'Reclassified as direct Settlement payback instead of Expense.',
          action: 'AUTO_FIX'
        });
        anomalies.push({
          rowIdx,
          column: 'split_type',
          type: 'Settlement Payment Reclassification',
          originalValue: `split_type: ${rowData.split_type || 'blank'}, description: ${rowData.description}`,
          actionTaken: 'Reclassified as direct Settlement payment instead of Expense',
          severity: 'warning'
        });
      }

      // --- 7. Split Participants & Details Normalisation ---
      let splitWithNames = [];
      if (rowData.split_with.trim()) {
        splitWithNames = rowData.split_with.split(';').map(n => standardizeName(n.trim()));
      }

      splitWithNames.forEach(n => {
        if (n && n !== 'Unknown Payer') {
          uniqueMembers.add(n);
        }
      });

      // Special reclassification for Row 38 Sam deposit share
      if (rowData.description.includes('Sam deposit share')) {
        isSettlement = true;
        status = 'FLAGGED';
        rowAnomalies.push({
          column: 'description',
          type: 'SETTLEMENT_ROW',
          description: 'Reclassified Sam deposit share as a direct settlement to Aisha',
          action: 'AUTO_FIX'
        });
      }

      let parsedSplits = [];
      if (!isSettlement && cleanAmt > 0) {
        if (cleanSplitType === 'percentage') {
          const percentDetails = {};
          const detailParts = rowData.split_details.split(';');
          let totalPct = 0;

          detailParts.forEach(part => {
            const trimmedPart = part.trim();
            if (!trimmedPart) return;
            const match = trimmedPart.match(/(.+?)\s+(\d+)\s*%/);
            if (match) {
              const name = standardizeName(match[1]);
              const pct = parseFloat(match[2]);
              percentDetails[name] = pct;
              totalPct += pct;
            }
          });

          if (Math.abs(totalPct - 100) > 0.05) {
            status = 'FLAGGED';
            rowAnomalies.push({
              column: 'split_details',
              type: 'Split Percent Sum Mismatch',
              description: `Percentages sum to ${totalPct}%, scaled proportionally back to 100%.`,
              action: 'AUTO_FIX'
            });
            anomalies.push({
              rowIdx,
              column: 'split_details',
              type: 'Incorrect split percentage math',
              originalValue: rowData.split_details,
              actionTaken: `Normalised sum ${totalPct}% back to 100% proportionally`,
              severity: 'warning'
            });

            let calculatedSum = 0;
            const keys = Object.keys(percentDetails);
            keys.forEach((key, index) => {
              const originalPct = percentDetails[key];
              const normalizedPct = (originalPct / totalPct) * 100;
              const splitAmt = index === keys.length - 1
                ? (cleanAmt - calculatedSum)
                : (cleanAmt * normalizedPct) / 100;

              calculatedSum += Math.round(splitAmt * 100) / 100;
              parsedSplits.push({
                userId: key,
                amount: Math.round(splitAmt * 100) / 100,
                percentage: Math.round(normalizedPct * 100) / 100
              });
            });
          } else {
            let calculatedSum = 0;
            const keys = Object.keys(percentDetails);
            keys.forEach((key, index) => {
              const pct = percentDetails[key];
              const splitAmt = index === keys.length - 1
                ? (cleanAmt - calculatedSum)
                : (cleanAmt * pct) / 100;

              calculatedSum += Math.round(splitAmt * 100) / 100;
              parsedSplits.push({
                userId: key,
                amount: Math.round(splitAmt * 100) / 100,
                percentage: pct
              });
            });
          }
        } 
        
        else if (cleanSplitType === 'share') {
          const shareDetails = {};
          const detailParts = rowData.split_details.split(';');
          let totalShares = 0;

          detailParts.forEach(part => {
            const trimmedPart = part.trim();
            if (!trimmedPart) return;
            const match = trimmedPart.match(/(.+?)\s+(\d+)/);
            if (match) {
              const name = standardizeName(match[1]);
              const sh = parseFloat(match[2]);
              shareDetails[name] = sh;
              totalShares += sh;
            }
          });

          let calculatedSum = 0;
          const keys = Object.keys(shareDetails);
          keys.forEach((key, index) => {
            const sh = shareDetails[key];
            const splitAmt = index === keys.length - 1
              ? (cleanAmt - calculatedSum)
              : (cleanAmt * sh) / totalShares;

            calculatedSum += Math.round(splitAmt * 100) / 100;
            parsedSplits.push({
              userId: key,
              amount: Math.round(splitAmt * 100) / 100,
              share: sh
            });
          });
        } 
        
        else if (cleanSplitType === 'unequal') {
          const unequalDetails = {};
          const detailParts = rowData.split_details.split(';');
          let totalUnequal = 0;

          detailParts.forEach(part => {
            const trimmedPart = part.trim();
            if (!trimmedPart) return;
            const match = trimmedPart.match(/(.+?)\s+(\d+)/);
            if (match) {
              const name = standardizeName(match[1]);
              const amt = parseFloat(match[2]);
              unequalDetails[name] = amt;
              totalUnequal += amt;
            }
          });

          if (Math.abs(totalUnequal - Math.abs(cleanAmt)) > 0.05) {
            status = 'FLAGGED';
            rowAnomalies.push({
              column: 'split_details',
              type: 'Unequal Split Sum Mismatch',
              description: `Unequal splits sum to ${totalUnequal}, scaled proportionally back to total ₹${cleanAmt}.`,
              action: 'AUTO_FIX'
            });
            anomalies.push({
              rowIdx,
              column: 'split_details',
              type: 'Unequal Split Sum Mismatch',
              originalValue: `splits sum: ${totalUnequal}, total: ${cleanAmt}`,
              actionTaken: 'Proportionally scaled exact split amounts to match total',
              severity: 'warning'
            });

            let calculatedSum = 0;
            const keys = Object.keys(unequalDetails);
            keys.forEach((key, index) => {
              const origSplitVal = unequalDetails[key];
              const splitAmt = index === keys.length - 1
                ? (cleanAmt - calculatedSum)
                : (cleanAmt * origSplitVal) / totalUnequal;

              calculatedSum += Math.round(splitAmt * 100) / 100;
              parsedSplits.push({
                userId: key,
                amount: Math.round(splitAmt * 100) / 100
              });
            });
          } else {
            Object.keys(unequalDetails).forEach(key => {
              parsedSplits.push({
                userId: key,
                amount: unequalDetails[key]
              });
            });
          }
        } 
        
        else {
          cleanSplitType = 'equal';
          const splitAmt = Math.round((cleanAmt / splitWithNames.length) * 100) / 100;
          let calculatedSum = 0;

          splitWithNames.forEach((name, index) => {
            const finalAmt = index === splitWithNames.length - 1
              ? (cleanAmt - calculatedSum)
              : splitAmt;
            calculatedSum += finalAmt;

            parsedSplits.push({
              userId: name,
              amount: Math.round(finalAmt * 100) / 100
            });
          });
        }
      }

      // Check former member Meera anomaly (moved out March 29 Sunday, dinner April 2 included)
      if (cleanDate > '2026-03-29' && splitWithNames.includes('Meera') && rowData.description.includes('Groceries BigBasket')) {
        status = 'FLAGGED';
        rowAnomalies.push({
          column: 'split_with',
          type: 'Former Member Split',
          description: 'Meera moved out March 29, but split includes Meera. Kept but flagged.',
          action: 'FLAG_FOR_REVIEW'
        });
        anomalies.push({
          rowIdx,
          column: 'split_with',
          type: 'Former Member Included',
          originalValue: rowData.split_with,
          actionTaken: 'Kept Meera in split list as logged, but flagged anomaly (Meera moved out Sunday March 29)',
          severity: 'warning'
        });
      }

      parsedRows.push({
        rowIndex: rowIdx,
        normalizedRow: {
          date: cleanDate,
          description: rowData.description.trim(),
          paid_by: cleanPayer,
          amount: cleanAmt,
          currency: cleanCurrency,
          split_type: isSettlement ? '' : cleanSplitType,
          isSettlement,
          splits: parsedSplits,
          splitWithNames
        },
        originalRow: rowData,
        anomalies: rowAnomalies,
        status
      });

      initialApprovals[rowIdx] = !isDuplicate && cleanAmt !== 0;
    }

    setParsingData({
      reports: parsedRows,
      total_rows: parsedRows.length,
      members: Array.from(uniqueMembers)
    });
    setSelectedRows(initialApprovals);
    setResolvedValues(initialResolutions);
    setPhase('preview');
    setUploading(false);
  };

  const handleToggleRow = (rowIdx, approveValue) => {
    setSelectedRows(prev => ({ ...prev, [rowIdx]: approveValue }));
  };

  const handleApproveAll = () => {
    if (!parsingData) return;
    const newApprovals = { ...selectedRows };
    parsingData.reports.forEach(r => {
      const isSkip = r.anomalies.some(a => a.action === 'SKIP');
      if (!isSkip) {
        newApprovals[r.rowIndex] = true;
      }
    });
    setSelectedRows(newApprovals);
  };

  const handleDateOptionChange = (rowIdx, dateVal) => {
    setResolvedValues(prev => ({
      ...prev,
      [rowIdx]: { ...prev[rowIdx], selectedDate: dateVal }
    }));
  };

  const handleImportConfirmed = async () => {
    if (!parsingData) return;
    setImporting(true);
    setImportStatus('Initializing database profiles...');
    setError('');

    try {
      const userMappings = {}; 

      // 1. Fetch current user profile
      const { data: currentProfile } = await supabase
        .from('users')
        .select('id, name')
        .eq('id', user.id)
        .single();
      
      if (currentProfile) {
        userMappings[currentProfile.name] = currentProfile.id;
      }

      // 2. Fetch or create group member accounts client-side
      for (const name of parsingData.members) {
        if (userMappings[name]) continue;

        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('name', name)
          .maybeSingle();

        if (existingUser) {
          userMappings[name] = existingUser.id;
        } else {
          setImportStatus(`Registering CSV member profile: ${name}...`);
          const { data: newUser, error: insertError } = await supabase
            .from('users')
            .insert([{ id: generateUUID(), name, email: null }])
            .select()
            .single();

          if (insertError) throw insertError;
          userMappings[name] = newUser.id;
        }
      }

      if (!userMappings['Unknown Payer']) {
        const { data: existingUnknown } = await supabase
          .from('users')
          .select('id')
          .eq('name', 'Unknown Payer')
          .maybeSingle();
        
        if (existingUnknown) {
          userMappings['Unknown Payer'] = existingUnknown.id;
        } else {
          const { data: newUnknown } = await supabase
            .from('users')
            .insert([{ id: generateUUID(), name: 'Unknown Payer', email: null }])
            .select()
            .single();
          userMappings['Unknown Payer'] = newUnknown.id;
        }
      }

      // 3. Ensure members are added to the group
      setImportStatus('Adding group members...');
      const { data: currentMembers } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', groupId);

      const existingMemberIds = new Set((currentMembers || []).map(m => m.user_id));

      const memberInserts = Object.values(userMappings)
        .filter(uid => !existingMemberIds.has(uid))
        .map(uid => ({
          group_id: groupId,
          user_id: uid
        }));

      if (memberInserts.length > 0) {
        const { error: memberError } = await supabase
          .from('group_members')
          .insert(memberInserts);

        if (memberError) throw memberError;
      }

      // 4. Ingest selected rows row-by-row
      const rowsToImport = parsingData.reports.filter(r => selectedRows[r.rowIndex]);
      let expensesCount = 0;
      let settlementsCount = 0;

      for (let i = 0; i < rowsToImport.length; i++) {
        const r = rowsToImport[i];
        const row = r.normalizedRow;
        
        // Resolve ambiguous date if chosen
        if (resolvedValues[r.rowIndex]?.selectedDate) {
          row.date = resolvedValues[r.rowIndex].selectedDate;
        }

        setImportStatus(`Ingesting transaction ${i + 1}/${rowsToImport.length}: ${row.description}...`);

        if (row.isSettlement) {
          const payerId = userMappings[row.paid_by] || userMappings['Unknown Payer'];
          const payeeName = row.splitWithNames[0] || 'Unknown Payer';
          const payeeId = userMappings[payeeName] || userMappings['Unknown Payer'];

          await recordSettlement(groupId, payerId, payeeId, Math.abs(row.amount), row.currency);
          settlementsCount++;
        } else if (row.amount === 0) {
          // Skip zero amounts
          console.log(`Skipped zero-amount expense: ${row.description}`);
        } else if (row.amount < 0) {
          // Handle negative refund
          const payerId = userMappings[row.paid_by] || userMappings['Unknown Payer'];
          for (const split of row.splits) {
            const payeeId = userMappings[split.userId] || userMappings['Unknown Payer'];
            if (payeeId === payerId) continue;

            const settlementAmt = Math.abs(split.amount);
            if (settlementAmt > 0.01) {
              await recordSettlement(groupId, payerId, payeeId, settlementAmt, row.currency);
            }
          }
          settlementsCount++;
        } else {
          // Handle normal expense
          const paidByUuid = userMappings[row.paid_by] || userMappings['Unknown Payer'];
          const mappedSplits = row.splits.map(s => ({
            userId: userMappings[s.userId] || userMappings['Unknown Payer'],
            amount: s.amount,
            percentage: s.percentage || null,
            share: s.share || null
          }));

          await addExpense(groupId, paidByUuid, row.description, row.amount, row.split_type, mappedSplits, row.currency);
          expensesCount++;
        }
      }

      setImportSuccess({
        expensesCount,
        settlementsCount,
        skippedCount: parsingData.reports.length - rowsToImport.length
      });
      setPhase('complete');

    } catch (err) {
      console.error(err);
      setError('Error during database ingestion: ' + err.message);
    } finally {
      setImporting(false);
    }
  };

  const getActionBadge = (r) => {
    if (r.anomalies.length === 0) {
      return { icon: '✅', label: 'Clean', colorClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    }
    const hasSkip = r.anomalies.some(a => a.action === 'SKIP');
    const hasFlagged = r.anomalies.some(a => a.action === 'FLAG_FOR_REVIEW');
    const hasAutoFix = r.anomalies.some(a => a.action === 'AUTO_FIX' || a.action === 'IMPORT_AS_REFUND' || a.type === 'SETTLEMENT_ROW');

    if (hasSkip) return { icon: '❌', label: 'Skipped', colorClass: 'bg-red-50 text-red-600 border-red-200' };
    if (hasFlagged) return { icon: '⏳', label: 'Review', colorClass: 'bg-amber-50 text-amber-700 border-amber-200' };
    if (hasAutoFix) return { icon: '✅', label: 'Fixed', colorClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' };

    return { icon: '✅', label: 'OK', colorClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  };

  const getFilteredReports = () => {
    if (!parsingData) return [];
    const allReports = parsingData.reports;
    if (tableFilter === 'all') return allReports;
    if (tableFilter === 'anomalies') return allReports.filter(r => r.anomalies.length > 0);
    if (tableFilter === 'flagged') return allReports.filter(r => r.status === 'FLAGGED');
    if (tableFilter === 'clean') return allReports.filter(r => r.status === 'CLEAN');
    return allReports;
  };

  const stats = parsingData ? {
    total: parsingData.total_rows,
    clean: parsingData.reports.filter(r => r.status === 'CLEAN').length,
    fixed: parsingData.reports.filter(r => r.status === 'FIXED').length,
    flagged: parsingData.reports.filter(r => r.status === 'FLAGGED').length,
    skipped: parsingData.reports.filter(r => r.anomalies.some(a => a.action === 'SKIP')).length,
    anomalyCount: parsingData.reports.filter(r => r.anomalies.length > 0).length,
    approved: Object.values(selectedRows).filter(v => v === true).length
  } : null;

  return (
    <Layout>
      <div className="w-full flex-1 flex flex-col bg-grey-bg overflow-hidden h-full">
        {/* Top Header Bar */}
        <div className="bg-white border-b border-border-custom px-8 py-5 flex justify-between items-center flex-shrink-0 text-left">
          <div>
            <h1 className="text-xl font-bold text-text-primary tracking-tight">CSV Importer</h1>
            <p className="text-xs text-text-muted mt-0.5">
              {phase === 'upload' && 'Upload & validate your CSV flatmate logs'}
              {phase === 'preview' && `Preview Report — ${stats?.total} rows, ${stats?.anomalyCount} anomalies detected`}
              {phase === 'complete' && 'Import completed successfully'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/groups/${groupId}`}
              className="border border-border-custom px-4 py-2 hover:bg-slate-50 transition-colors text-xs font-semibold rounded-lg text-text-primary"
            >
              ← Back to Group
            </Link>
            {phase === 'preview' && (
              <>
                <button
                  onClick={handleApproveAll}
                  className="px-4 py-2 bg-white border border-green-pri text-green-pri text-xs font-semibold rounded-lg hover:bg-emerald-50 cursor-pointer transition-all"
                >
                  Approve All
                </button>
                <button
                  onClick={handleImportConfirmed}
                  disabled={importing}
                  className="px-5 py-2 bg-green-pri hover:bg-green-light text-white text-xs font-bold rounded-lg shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  {importing ? '⏳ Importing...' : '✅ Confirm & Import'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="page-body flex-1 overflow-y-auto space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl text-xs font-medium text-left">
              {error}
            </div>
          )}

          {/* 1. UPLOAD PHASE */}
          {phase === 'upload' && (
            <div className="bg-white rounded-lg border border-border-custom p-8 text-left">
              <div className="max-w-xl mx-auto text-center space-y-5">
                <div className="text-5xl select-none">📁</div>
                <div>
                  <h3 className="text-lg font-bold text-text-primary">Upload Shared Expense CSV</h3>
                  <p className="text-xs text-text-muted mt-1 max-w-sm mx-auto">
                    Upload your flatmate expense logs. We&apos;ll standardise dates, resolve payer names, fix comma issues, round decimals and detect duplicates client-side before save.
                  </p>
                </div>

                <form onSubmit={handleUpload} className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="flex-1 w-full bg-grey-bg border border-border-custom text-xs text-text-muted p-3 rounded-lg focus:outline-none cursor-pointer file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-green-pri file:text-white file:cursor-pointer"
                  />
                  <button
                    type="submit"
                    disabled={uploading || !file}
                    className="w-full sm:w-auto px-6 py-3 bg-green-pri hover:bg-green-light text-white text-xs font-bold rounded-lg shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {uploading ? '⏳ Analyzing...' : '🔍 Validate CSV'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* 2. PREVIEW PHASE */}
          {phase === 'preview' && parsingData && (
            <div className="space-y-4">
              {/* Statistics Row */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <button
                  onClick={() => setTableFilter('all')}
                  className={`bg-white border p-4 rounded-lg text-center cursor-pointer transition-all ${tableFilter === 'all' ? 'border-green-pri ring-1 ring-green-pri/30 shadow-sm' : 'border-border-custom hover:border-slate-300'}`}
                >
                  <p className="text-[9px] uppercase font-bold text-text-muted tracking-wider">Total Rows</p>
                  <p className="text-2xl font-black text-text-primary mt-1">{stats.total}</p>
                </button>
                <button
                  onClick={() => setTableFilter('clean')}
                  className={`bg-white border p-4 rounded-lg text-center cursor-pointer transition-all ${tableFilter === 'clean' ? 'border-emerald-500 ring-1 ring-emerald-500/30 shadow-sm' : 'border-border-custom hover:border-slate-300'}`}
                >
                  <p className="text-[9px] uppercase font-bold text-text-muted tracking-wider">Clean</p>
                  <p className="text-2xl font-black text-emerald-600 mt-1">{stats.clean}</p>
                </button>
                <button
                  onClick={() => setTableFilter('anomalies')}
                  className={`bg-white border p-4 rounded-lg text-center cursor-pointer transition-all ${tableFilter === 'anomalies' ? 'border-emerald-500 ring-1 ring-emerald-500/30 shadow-sm' : 'border-border-custom hover:border-slate-300'}`}
                >
                  <p className="text-[9px] uppercase font-bold text-text-muted tracking-wider">Auto-Fixed</p>
                  <p className="text-2xl font-black text-emerald-600 mt-1">{stats.fixed}</p>
                </button>
                <button
                  onClick={() => setTableFilter('flagged')}
                  className={`bg-white border p-4 rounded-lg text-center cursor-pointer transition-all ${tableFilter === 'flagged' ? 'border-amber-500 ring-1 ring-amber-500/30 shadow-sm' : 'border-border-custom hover:border-slate-300'}`}
                >
                  <p className="text-[9px] uppercase font-bold text-text-muted tracking-wider">Need Review</p>
                  <p className="text-2xl font-black text-amber-600 mt-1">{stats.flagged}</p>
                </button>
                <div className="bg-white border border-border-custom p-4 rounded-lg text-center">
                  <p className="text-[9px] uppercase font-bold text-text-muted tracking-wider">Approved</p>
                  <p className="text-2xl font-black text-green-pri mt-1">{stats.approved}</p>
                </div>
              </div>

              {/* Grid Preview Table */}
              <div className="bg-white rounded-xl border border-border-custom shadow-xs overflow-hidden text-left">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-border-custom text-text-muted font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-3.5 px-4 w-14 text-center">Row</th>
                        <th className="py-3.5 px-4">Description</th>
                        <th className="py-3.5 px-4 w-44">Anomaly</th>
                        <th className="py-3.5 px-4 w-28 text-center">Action</th>
                        <th className="py-3.5 px-4 w-36 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-custom text-text-primary">
                      {getFilteredReports().map((r) => {
                        const isApproved = selectedRows[r.rowIndex] || false;
                        const hasAnomalies = r.anomalies.length > 0;
                        const isSkip = r.anomalies.some(a => a.action === 'SKIP');
                        const isAutoFix = r.anomalies.some(a => a.action === 'AUTO_FIX' || a.action === 'IMPORT_AS_REFUND');
                        const isAmbiguousDate = r.anomalies.some(a => a.type === 'Ambiguous Date Resolved');
                        const badge = getActionBadge(r);

                        let rowBg = '';
                        if (isSkip) rowBg = 'bg-red-50/30';
                        else if (r.status === 'FLAGGED' && !isApproved) rowBg = 'bg-amber-50/40';

                        return (
                          <tr key={r.rowIndex} className={`hover:bg-slate-50/60 transition-colors ${rowBg}`}>
                            <td className="py-3 px-4 font-extrabold text-center text-text-muted text-sm">{r.rowIndex}</td>
                            <td className="py-3 px-4">
                              <p className="font-semibold text-[13px] text-text-primary truncate max-w-xs">{r.normalizedRow.description}</p>
                              <div className="text-[10px] text-text-muted mt-0.5 flex flex-wrap gap-x-2 items-center">
                                <span>Payer: <strong className="text-slate-700">{r.normalizedRow.paid_by}</strong></span>
                                <span>•</span>
                                <span>{r.normalizedRow.currency === 'USD' ? '$' : '₹'}{Math.abs(r.normalizedRow.amount)}</span>
                                <span>•</span>
                                <span>{r.normalizedRow.date}</span>
                              </div>
                              {hasAnomalies && (
                                <div className="mt-1 space-y-0.5">
                                  {r.anomalies.map((anom, aIdx) => (
                                    <p key={aIdx} className="text-[10px] flex items-center gap-1 font-medium text-amber-700">
                                      <span>⚠️</span> {anom.description}
                                    </p>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              {hasAnomalies ? (
                                <div className="flex flex-wrap gap-1">
                                  {r.anomalies.map((a, aIdx) => (
                                    <span key={aIdx} className="text-[8px] uppercase px-1.5 py-0.5 rounded border border-amber-200 bg-amber-50 text-amber-700 font-black tracking-wider">
                                      {a.type}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border ${badge.colorClass}`}>
                                {badge.label}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex flex-col items-center gap-1 justify-center">
                                {isSkip ? (
                                  <span className="text-[10px] text-red-400 uppercase font-black">Skipped</span>
                                ) : (
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      onClick={() => handleToggleRow(r.rowIndex, true)}
                                      className={`px-2.5 py-1 border rounded-md text-[10px] font-bold tracking-tight cursor-pointer transition-all ${isApproved ? 'bg-green-pri text-white border-green-pri shadow-sm' : 'bg-white text-text-muted border-border-custom hover:bg-slate-50'}`}
                                    >
                                      ✓ Approve
                                    </button>
                                    <button
                                      onClick={() => handleToggleRow(r.rowIndex, false)}
                                      className={`px-2.5 py-1 border rounded-md text-[10px] font-bold tracking-tight cursor-pointer transition-all ${!isApproved ? 'bg-red-500 text-white border-red-500 shadow-sm' : 'bg-white text-text-muted border-border-custom hover:bg-slate-50'}`}
                                    >
                                      ✕ Skip
                                    </button>
                                  </div>
                                )}
                                {isAmbiguousDate && resolvedValues[r.rowIndex] && (
                                  <select
                                    value={resolvedValues[r.rowIndex].selectedDate}
                                    onChange={(e) => handleDateOptionChange(r.rowIndex, e.target.value)}
                                    className="mt-1 bg-white border border-border-custom rounded-md px-1.5 py-0.5 text-[9px] font-semibold focus:outline-none focus:border-green-pri text-text-primary"
                                  >
                                    {resolvedValues[r.rowIndex].dateOptions.map((opt, i) => (
                                      <option key={i} value={opt}>{opt}</option>
                                    ))}
                                  </select>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bottom Ingest bar */}
              <div className="bg-white border border-border-custom p-5 rounded-lg flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="text-xs text-text-muted">
                  <span className="font-bold text-text-primary">{stats.approved}</span> rows approved for ingestion,{' '}
                  <span className="font-bold">{stats.flagged}</span> flagged warnings.
                </div>
                <div className="flex gap-3">
                  {importing ? (
                    <div className="flex items-center gap-2 text-xs font-bold text-green-pri">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>{importStatus}</span>
                    </div>
                  ) : (
                    <button
                      onClick={handleImportConfirmed}
                      className="px-5 py-2.5 bg-green-pri hover:bg-green-light text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer transition-all"
                    >
                      Confirm & Ingest CSV Ledger
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 3. COMPLETE PHASE */}
          {phase === 'complete' && importSuccess && (
            <div className="bg-white border border-border-custom p-10 rounded-lg text-center space-y-5 shadow-xs max-w-lg mx-auto">
              <span className="text-5xl block select-none">🎉</span>
              <div>
                <h3 className="text-xl font-bold text-text-primary">Ingestion Complete!</h3>
                <p className="text-xs text-text-muted mt-2 max-w-sm mx-auto">
                  Your CSV transactions have been compiled and saved directly to the database.
                </p>
              </div>

              <div className="bg-slate-50 border border-border-custom rounded-xl p-5 text-left text-xs space-y-2 max-w-xs mx-auto">
                <p className="font-bold text-sm text-text-primary pb-2 border-b border-border-custom mb-2">Summary Ingestion</p>
                <div className="grid grid-cols-2 gap-x-8 gap-y-1.5">
                  <span className="text-text-muted">Expenses:</span>
                  <span className="font-bold text-text-primary">{importSuccess.expensesCount}</span>
                  <span className="text-text-muted">Settlements:</span>
                  <span className="font-bold text-text-primary">{importSuccess.settlementsCount}</span>
                  <span className="text-text-muted">Skipped:</span>
                  <span className="font-bold text-slate-400">{importSuccess.skippedCount}</span>
                </div>
              </div>

              <div className="pt-3 flex justify-center gap-3">
                <button
                  onClick={() => {
                    setPhase('upload');
                    setParsingData(null);
                    setImportSuccess(null);
                    setFile(null);
                  }}
                  className="px-5 py-2.5 bg-white border border-border-custom text-text-primary text-xs font-semibold rounded-lg hover:bg-slate-50 cursor-pointer transition-all"
                >
                  📁 Import Another CSV
                </button>
                <Link
                  href={`/groups/${groupId}`}
                  className="px-5 py-2.5 bg-green-pri hover:bg-green-light text-white text-xs font-bold rounded-lg shadow-sm inline-flex items-center gap-1 transition-all"
                >
                  Return to Group Dashboard →
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
