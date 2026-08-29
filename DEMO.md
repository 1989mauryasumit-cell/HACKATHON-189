# System Demonstration Walkthrough

Follow this guide to demonstrate the full capabilities of the Kraken CNA system to judges or administrators.

## Step 1: Initializing and Seeding the Database

1. Open your browser to `http://localhost:3000`.
2. Locate and click the **"Reset & Load Demo Cartel"** button on the homepage dashboard.
3. This seeds:
   - **672 Entities:** (Delhi and UP Cartel suspects, plus background noise).
   - **3,560 Relationships:** (Call Detail Records and bank transactions).
   - **750 Case documents:** (FIR reports, social media logs, and surveillance notes).

## Step 2: Running the Evaluation Script

Demonstrate the 100% accuracy of the system against ground truth:
1. Open your terminal at the project root folder.
2. Run the command:
   ```bash
   node scripts/evaluate.js
   ```
3. Show the judges the formatted printed table showing:
   - **100.00% Entity Extraction Accuracy**
   - **100.00% Relationship Detection Accuracy**
   - **100.00% Entity Resolution Merge Accuracy**
   - **PageRank Rank 1:** Devendra Maurya (Kingpin is correctly identified).
   - **Betweenness Centrality Rank 1:** Arjun Sen (Broker is correctly identified).
   - **12 / 12 alerts detected.**

## Step 3: Interactive Network Graph Analysis

1. Go to the **Network Graph** page in the sidebar.
2. Show the judges how nodes are color-coded (Blue = Person, Green = Phone, Purple = Bank).
3. Select **"Force Directed (COSE)"** layout and show how the Delhi Cartel cell (dense blue cluster) and UP Cartel cell (dense blue cluster) are completely separated, and connected *only* via the broker node, **Arjun Sen**.
4. Click on **Arjun Sen** and show his Betweenness Centrality score, proving he holds the highest gatekeeping status.
5. Use the **Shortest Path Finder** in the sidebar:
   - Source: `Vikram Jagtap`
   - Target: `Sandeep Yadav`
   - Click **Search Paths**. Show the highlighted path routing directly through the broker, Arjun Sen.

## Step 4: Alerts & Workflow State

1. Navigate to the **Alerts** page in the sidebar.
2. Show the 12 active alerts (e.g. Circular Flow, Structuring Cash transfers, Burner SIM lifespan).
3. Click on **Structuring cash transfer bypass match**.
4. Read the plain English explanation detailing how Ramesh Patel split funds into ₹49,500 transfers.
5. Change its status to **"Investigating / Open Case"**. Explain that this action is immutably logged into the audit log ledger.

## Step 5: Generating AI Briefing PDF

1. Go to the **Reports** page.
2. Click **Generate Report** to assemble case metrics.
3. Once generated, click the **"Print PDF Dossier"** button. The page automatically hides navigation panels and prepares a clean, multi-page print layout.
