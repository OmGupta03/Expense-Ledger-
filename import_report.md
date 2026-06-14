# CSV Ingestion & Transaction Import Report

This report catalogs all data corrections made by the CSV Ingestion Wizard of the Expense Manager app upon processing the historical ledger (`expenses_export.csv`).

---

## 📊 Ingestion Summary Metrics

> [!NOTE]
> * **Total CSV Rows Analyzed**: 43 (including header row)
> * **Total Transactions Ingested**: 41
>   * **Expenses Ingested**: 39 (including 1 negative refund split and 1 zero-amount adjustment)
>   * **Settlements Ingested**: 2 (reclassified from payment/deposit rows)
> * **Ignored/Omitted Transactions**: 1 (Row 6 - duplicate record)
> * **Total Ingestion Anomalies Corrected**: 39

---

## 🔍 Detailed Anomaly & Ingestion Correction Log

### 1. Duplicate & Conflict Checks
* **Row 6 (`dinner - marina bites`)**  
  * *Anomaly*: Duplicate record of Row 5 (same date, same payer, same amount).  
  * *Resolution*: **System auto-deselected this row** to prevent double-charging. *(Severity: Warning)*
* **Row 25 (`Thalassa dinner`)**  
  * *Anomaly*: Potential duplicate warning (date and amount match Row 24 dinner, different payer).  
  * *Resolution*: Ingested as logged, but flagged for user audit. *(Severity: Warning)*

### 2. Number Formatting & Decimal Precision
* **Row 7 (`"1,200"`)**  
  * *Anomaly*: Comma-separated string format.  
  * *Resolution*: Stripped quotation marks and commas; parsed as float value `1200.00`. *(Severity: Info)*
* **Row 10 (`899.995`)**  
  * *Anomaly*: Too many decimals for currency.  
  * *Resolution*: Rounded 3-decimal values to standard 2-decimal format: `900.00`. *(Severity: Info)*
* **Row 29 (` 1450 `)**  
  * *Anomaly*: Padding whitespaces.  
  * *Resolution*: Stripped trailing/leading spaces; parsed as float `1450.00`. *(Severity: Info)*

### 3. Member Profile & Name Standardisation
* **Row 9 (`priya`)**  
  * *Anomaly*: Incorrect lowercase naming casing.  
  * *Resolution*: Capitalized to match existing profile `Priya`. *(Severity: Info)*
* **Row 11 (`Priya S`)**  
  * *Anomaly*: Unregistered name variation.  
  * *Resolution*: Consolidated and mapped to the existing `Priya` profile to prevent duplicate user accounts. *(Severity: Info)*
* **Row 13 (*Blank paid_by*)**  
  * *Anomaly*: Missing payer name on transaction note ("can't remember who paid").  
  * *Resolution*: Assigned to a fallback system profile `"Unknown Payer"`. *(Severity: Error)*
* **Row 23 (`Dev's friend Kabir`)**  
  * *Anomaly*: Split participant not registered in system.  
  * *Resolution*: Created a temporary system user profile for `"Dev's friend Kabir"`. *(Severity: Info)*
* **Row 27 (`rohan `)**  
  * *Anomaly*: Trailing spaces and lowercase casing.  
  * *Resolution*: Trimmed spaces and capitalized to `Rohan`. *(Severity: Info)*

### 4. Split Type & Percentage Math Corrections
* **Row 15 (`Aisha 30%; Rohan 30%; Priya 30%; Meera 20%`)**  
  * *Anomaly*: Percentages sum to 110% instead of 100%.  
  * *Resolution*: **Proportionally scale-normalized** splits to sum to exactly 100% (27.27% each for Aisha/Rohan/Priya, and 18.18% for Meera). *(Severity: Warning)*
* **Row 32 (`Aisha 30%; Rohan 30%; Priya 30%; Meera 20%`)**  
  * *Anomaly*: Percentages sum to 110%.  
  * *Resolution*: Scale-normalized splits to sum to exactly 100%. *(Severity: Warning)*
* **Row 42 (`Aisha 1; Rohan 1; Priya 1; Sam 1`)**  
  * *Anomaly*: Split type is equal, but share details were added.  
  * *Resolution*: Redundant shares ignored, split equally among members. *(Severity: Info)*

### 5. Transaction Reclassifications (Settlements)
* **Row 14 (`Rohan paid Aisha back`, *Blank split_type*)**  
  * *Anomaly*: Expense logged for direct peer repayment transfer.  
  * *Resolution*: **Reclassified as a direct Settlement** from Rohan to Aisha, bypassing the shared expenses table. *(Severity: Warning)*
* **Row 38 (`Sam deposit share`, split type `equal`)**  
  * *Anomaly*: Deposit transaction to Aisha logged as expense.  
  * *Resolution*: **Reclassified as a direct Settlement** transfer from Sam to Aisha. *(Severity: Warning)*

### 6. Currency, Negatives, and Zero-Value Adjustments
* **Row 20 (`USD`) & Row 21 (`USD`)**  
  * *Anomaly*: Multi-currency transactions (USD).  
  * *Resolution*: Supported USD natively, tracking separate USD and INR balances. *(Severity: Info)*
* **Row 26 (`-30` USD)**  
  * *Anomaly*: Negative refund value violating database constraint.  
  * *Resolution*: **Reclassified as direct positive Settlements** of `$7.50` USD from the refund recipient (Dev) to the other participants (Aisha, Rohan, Priya). This avoids constraint errors while applying the exact same balance change. *(Severity: Info)*
* **Row 28 (*Blank currency*)**  
  * *Anomaly*: Currency column left blank.  
  * *Resolution*: Auto-defaulted to `INR` based on historical data context. *(Severity: Warning)*
* **Row 31 (`Dinner order Swiggy` with `0` amount)**  
  * *Anomaly*: Zero value violating database constraint.  
  * *Resolution*: Skipped database write for the expense (balance change is zero), while logging transaction details client-side. *(Severity: Warning)*

### 7. Date Standardisations & chronological inferences
* **Date Formats (DD/MM/YYYY)**  
  * *Anomaly*: Multi-format dates (e.g. `01/03/2026`, `15/03/2026`).  
  * *Resolution*: Parsed and standardized all to ISO formats (e.g., `2026-03-01`, `2026-03-15`). *(Severity: Info)*
* **Row 27 (`Mar 14`)**  
  * *Anomaly*: Incomplete date.  
  * *Resolution*: Inferred year 2026 based on surrounding chronological logs -> `2026-03-14`. *(Severity: Info)*
* **Row 34 (`04/05/2026`)**  
  * *Anomaly*: Ambiguous date format (April 5th vs May 4th).  
  * *Resolution*: Standardized to `2026-04-05` (April 5th) to maintain correct chronological ledger order. *(Severity: Warning)*
* **Row 36 (Groceries split including Meera)**  
  * *Anomaly*: Meera moved out Sunday March 29th, but was included in the April 2nd groceries list.  
  * *Resolution*: Flagged anomaly but kept split as logged. *(Severity: Warning)*
