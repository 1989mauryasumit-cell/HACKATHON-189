const fs = require('fs');
const path = require('path');

// 1. DETERMINISTIC SEED SYSTEM (Linear Congruential Generator)
let seedVal = 8675309;
function random() {
  seedVal = (seedVal * 9301 + 49297) % 233280;
  return seedVal / 233280;
}

function randomRange(min, max) {
  return Math.floor(random() * (max - min) + min);
}

function randomChoice(arr) {
  return arr[Math.floor(random() * arr.length)];
}

// Generate random Indian phone number
function generateIndianPhone() {
  const prefixes = ['98', '99', '97', '95', '94', '90', '80', '88', '70'];
  let num = randomChoice(prefixes);
  for (let i = 0; i < 8; i++) {
    num += randomRange(0, 10).toString();
  }
  return `+91 ${num.slice(0, 5)} ${num.slice(5)}`;
}

// Generate random Indian vehicle registration plate
function generateIndianVehicle() {
  const states = ['DL', 'MH', 'KA', 'HR', 'UP', 'GJ', 'WB', 'TN', 'AP', 'TS'];
  const state = randomChoice(states);
  const district = randomRange(1, 15).toString().padStart(2, '0');
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const char1 = randomChoice(alphabet);
  const char2 = randomChoice(alphabet);
  const num = randomRange(1000, 9999);
  return `${state}-${district}-${char1}${char2}-${num}`;
}

// Generate random IFSC bank details
function generateIFSCAndAccount(bankName) {
  const accounts = {
    'SBI': { ifsc: 'SBIN000' + randomRange(1000, 9999), len: 11 },
    'HDFC': { ifsc: 'HDFC000' + randomRange(1000, 9999), len: 14 },
    'ICICI': { ifsc: 'ICIC000' + randomRange(1000, 9999), len: 12 },
    'PNB': { ifsc: 'PUNB000' + randomRange(1000, 9999), len: 16 }
  };
  const bank = bankName || randomChoice(Object.keys(accounts));
  const bankConfig = accounts[bank];
  let acct = '';
  for (let i = 0; i < bankConfig.len; i++) {
    acct += randomRange(0, 10).toString();
  }
  return { bank, ifsc: bankConfig.ifsc, accountNumber: acct };
}

// Lists of Indian names and locations for background noise
const firstNames = ['Amit', 'Rajesh', 'Sanjay', 'Vikram', 'Ramesh', 'Priya', 'Neha', 'Suresh', 'Vijay', 'Rahul', 'Anil', 'Sunil', 'Karan', 'Arjun', 'Deepak', 'Manish', 'Alok', 'Ajay', 'Harish', 'Preeti', 'Kiran', 'Pooja', 'Ravi', 'Ritu', 'Ketan', 'Abhishek', 'Gaurav', 'Aditya', 'Jyoti', 'Shweta'];
const lastNames = ['Kumar', 'Sharma', 'Singh', 'Yadav', 'Patel', 'Sen', 'Gupta', 'Maurya', 'Jagtap', 'Shinde', 'Joshi', 'Mehta', 'Mishra', 'Trivedi', 'Reddy', 'Verma', 'Choudhury', 'Iyer', 'Pillai', 'Rao', 'Dubey', 'Nair', 'Pandey', 'Saxena', 'Deshmukh', 'Kulkarni', 'Bose', 'Das', 'Roy', 'Prasad'];
const cities = ['Delhi', 'Mumbai', 'Bengaluru', 'Chennai', 'Kolkata', 'Hyderabad', 'Ahmedabad', 'Pune', 'Lucknow', 'Patna', 'Jaipur', 'Indore', 'Bhopal', 'Guwahati', 'Ranchi', 'Chandigarh'];

function generateRandomName() {
  return `${randomChoice(firstNames)} ${randomChoice(lastNames)}`;
}

// main execution
function generate() {
  console.log("Generating synthetic database...");

  // Load ground truth definitions
  const groundTruthPath = path.join(__dirname, 'ground-truth.json');
  const groundTruth = JSON.parse(fs.readFileSync(groundTruthPath, 'utf8'));
  
  const docs = [];
  const entities = [];
  const relationships = [];
  const alerts = [];
  
  // Set up lookup table for entities to resolve duplicates
  const entityLookup = new Map(); // name -> entity object

  function addEntity(name, type, attributes = {}) {
    const canonical = name.trim();
    if (entityLookup.has(canonical)) {
      const existing = entityLookup.get(canonical);
      existing.attributes = { ...existing.attributes, ...attributes };
      return existing;
    }
    const id = 'ent-' + (entities.length + 1).toString().padStart(5, '0');
    const newEnt = {
      id,
      entity_type: type,
      canonical_name: canonical,
      aliases: [],
      attributes,
      risk_score: 0,
      risk_breakdown: {},
      is_verified: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    entities.push(newEnt);
    entityLookup.set(canonical, newEnt);
    return newEnt;
  }

  // A. REGISTER PLANTED GROUND TRUTH ENTITIES
  const gtEntities = {};
  groundTruth.planted_entities.forEach(ent => {
    const attrs = {};
    if (ent.phone) attrs.phone = ent.phone;
    if (ent.vehicle) attrs.vehicle = ent.vehicle;
    if (ent.account) attrs.account = ent.account;
    if (ent.alias) attrs.alias = ent.alias;
    
    const created = addEntity(ent.name, ent.type, attrs);
    gtEntities[ent.name] = created;

    // Register identifier entities (phones, accounts, vehicles) as separate searchable nodes
    if (ent.phone) {
      const phoneEnt = addEntity(ent.phone, 'phone', { owner: ent.name });
      relationships.push({
        id: 'rel-' + (relationships.length + 1).toString().padStart(5, '0'),
        source_entity_id: created.id,
        target_entity_id: phoneEnt.id,
        relation_type: 'owns',
        weight: 1.0,
        confidence: 1.0,
        occurrence_count: 1,
        evidence: [],
        inference_method: 'extracted',
        status: 'confirmed',
        created_at: new Date().toISOString()
      });
    }
    if (ent.account) {
      const acctEnt = addEntity(ent.account, 'bank_account', { owner: ent.name, ifsc: 'HDFC0001001' });
      relationships.push({
        id: 'rel-' + (relationships.length + 1).toString().padStart(5, '0'),
        source_entity_id: created.id,
        target_entity_id: acctEnt.id,
        relation_type: 'owns',
        weight: 1.0,
        confidence: 1.0,
        occurrence_count: 1,
        evidence: [],
        inference_method: 'extracted',
        status: 'confirmed',
        created_at: new Date().toISOString()
      });
    }
    if (ent.vehicle) {
      const vehEnt = addEntity(ent.vehicle, 'vehicle', { owner: ent.name });
      relationships.push({
        id: 'rel-' + (relationships.length + 1).toString().padStart(5, '0'),
        source_entity_id: created.id,
        target_entity_id: vehEnt.id,
        relation_type: 'owns',
        weight: 1.0,
        confidence: 1.0,
        occurrence_count: 1,
        evidence: [],
        inference_method: 'extracted',
        status: 'confirmed',
        created_at: new Date().toISOString()
      });
    }
  });

  // Seed the 7 core planted relationships in the DB
  groundTruth.planted_relationships.forEach(pr => {
    const src = gtEntities[pr.source];
    const dst = gtEntities[pr.target];
    if (src && dst) {
      relationships.push({
        id: 'rel-' + (relationships.length + 1).toString().padStart(5, '0'),
        source_entity_id: src.id,
        target_entity_id: dst.id,
        relation_type: pr.type,
        weight: 3.0,
        confidence: 1.0,
        occurrence_count: 5,
        evidence: [],
        inference_method: 'extracted',
        status: 'confirmed',
        created_at: new Date().toISOString()
      });
    }
  });

  // Connect all Cell A members to each other directly to form a dense clique, reducing lieutenant betweenness
  const cellANames = ["Devendra Maurya", "Vikram Jagtap", "Sanjay Dutt", "Anil Kapoor", "Sunil Shetty", "Jackie Shroff", "Nana Patekar", "Govinda Ahuja", "Johnny Lever"];
  for (let i = 0; i < cellANames.length; i++) {
    for (let j = i + 1; j < cellANames.length; j++) {
      const src = gtEntities[cellANames[i]];
      const dst = gtEntities[cellANames[j]];
      if (src && dst) {
        relationships.push({
          id: 'rel-' + (relationships.length + 1).toString().padStart(5, '0'),
          source_entity_id: src.id,
          target_entity_id: dst.id,
          relation_type: 'associate_of',
          weight: 1.0,
          confidence: 1.0,
          occurrence_count: 1,
          evidence: [],
          inference_method: 'extracted',
          status: 'confirmed',
          created_at: new Date().toISOString()
        });
      }
    }
  }

  // Connect all Cell B members to each other directly to form a dense clique
  const cellBNames = ["Sandeep Yadav", "Paresh Rawal", "Kader Khan", "Shakti Kapoor", "Gulshan Grover", "Amrish Puri", "Danny Denzongpa", "Prem Chopra", "Ranjeet Bedi"];
  for (let i = 0; i < cellBNames.length; i++) {
    for (let j = i + 1; j < cellBNames.length; j++) {
      const src = gtEntities[cellBNames[i]];
      const dst = gtEntities[cellBNames[j]];
      if (src && dst) {
        relationships.push({
          id: 'rel-' + (relationships.length + 1).toString().padStart(5, '0'),
          source_entity_id: src.id,
          target_entity_id: dst.id,
          relation_type: 'associate_of',
          weight: 1.0,
          confidence: 1.0,
          occurrence_count: 1,
          evidence: [],
          inference_method: 'extracted',
          status: 'confirmed',
          created_at: new Date().toISOString()
        });
      }
    }
  }

  // Connect pm-08 (Paresh Rawal) to Arjun Sen as an additional link to split Cell B traffic
  const pm08 = gtEntities["Paresh Rawal"];
  const broker = gtEntities["Arjun Sen"];
  if (pm08 && broker) {
    relationships.push({
      id: 'rel-' + (relationships.length + 1).toString().padStart(5, '0'),
      source_entity_id: broker.id,
      target_entity_id: pm08.id,
      relation_type: 'associate_of',
      weight: 1.0,
      confidence: 1.0,
      occurrence_count: 1,
      evidence: [],
      inference_method: 'extracted',
      status: 'confirmed',
      created_at: new Date().toISOString()
    });
  }

  // B. CREATE MOCK DOCUMENTS (300 FIRs, 200 Surveillance, 100 Social Media, 150 Criminal History)
  console.log("Generating 300 FIRs, 200 Surveillance, 100 Social Media, and 150 Criminal Records...");

  // Generate 300 FIR narratives
  for (let i = 1; i <= 300; i++) {
    const dateStr = `2026-0${randomRange(1, 8)}-${randomRange(10, 28)}`;
    const fName1 = randomChoice(firstNames);
    const lName1 = randomChoice(lastNames);
    const suspect = `${fName1} ${lName1}`;
    const phone = generateIndianPhone();
    const vehicle = generateIndianVehicle();
    const city = randomChoice(cities);
    
    let narrative = "";
    const dice = random();
    if (dice < 0.05) {
      narrative = `First Information Report filed under Sec 154 CrPC at PS Connaught Place. Informant reports that Devendra Maurya (also known as Don, phone: +91 99100 88201) was coordinating a shipment of suspicious cargo using vehicle DL-1C-AA-9999. The suspect was accompanied by his close associate Vikram Jagtap (alias Vicky, phone: +91 98200 77102). Incident occurred on ${dateStr} near CP Metro Station.`;
    } else if (dice < 0.10) {
      narrative = `FIR Number CP-2026-${100 + i}. Police patrolling units intercepted vehicle ${vehicle} driven by Sandeep Yadav (phone: +91 95600 66303). Yadav was acting suspiciously and was found in contact with a broker named Arjun Sen (phone: +91 98300 44505). Subsequent check revealed Yadav was carrying unaccounted cash worth INR 4,50,000. Under questioning, he claimed the funds belonged to Devendra Maurya.`;
    } else {
      narrative = `FIR Registered at PS ${city} Central. The complainant reports fraud and criminal intimidation by suspect ${suspect} (contact phone: ${phone}). The suspect was seen driving a black sedan with license plate ${vehicle}. They demanded transfer of bank funds to account number ${generateIFSCAndAccount().accountNumber}. Date of offence: ${dateStr}. Investigation is active.`;
    }

    const docId = `doc-fir-${i.toString().padStart(3, '0')}`;
    docs.push({
      id: docId,
      source_type: 'fir',
      title: `FIR Case Report #${1000 + i} - PS ${city}`,
      raw_text: narrative,
      file_hash: 'hash-fir-' + i.toString().padStart(3, '0'),
      file_size: narrative.length,
      mime_type: 'text/plain',
      status: 'processed',
      created_at: `${dateStr}T10:00:00Z`
    });

    // Extract Entities & Relationships from FIR (Mock regex parser output)
    if (narrative.includes("Devendra Maurya")) {
      const dm = addEntity("Devendra Maurya", "person", { phone: "+91 99100 88201", vehicle: "DL-1C-AA-9999" });
      const vj = addEntity("Vikram Jagtap", "person", { phone: "+91 98200 77102" });
      relationships.push({
        id: 'rel-' + (relationships.length + 1).toString().padStart(5, '0'),
        source_entity_id: dm.id,
        target_entity_id: vj.id,
        relation_type: 'associate_of',
        weight: 2.0,
        confidence: 0.9,
        evidence: [docId],
        inference_method: 'extracted',
        status: 'confirmed',
        created_at: `${dateStr}T12:00:00Z`
      });
    } else if (narrative.includes("Sandeep Yadav")) {
      const sy = addEntity("Sandeep Yadav", "person", { phone: "+91 95600 66303" });
      const as = addEntity("Arjun Sen", "person", { phone: "+91 98300 44505" });
      relationships.push({
        id: 'rel-' + (relationships.length + 1).toString().padStart(5, '0'),
        source_entity_id: sy.id,
        target_entity_id: as.id,
        relation_type: 'associate_of',
        weight: 1.5,
        confidence: 0.85,
        evidence: [docId],
        inference_method: 'extracted',
        status: 'confirmed',
        created_at: `${dateStr}T12:00:00Z`
      });
    } else {
      const act = addEntity(suspect, "person", { phone });
      const phoneEnt = addEntity(phone, "phone");
      relationships.push({
        id: 'rel-' + (relationships.length + 1).toString().padStart(5, '0'),
        source_entity_id: act.id,
        target_entity_id: phoneEnt.id,
        relation_type: 'owns',
        weight: 1.0,
        confidence: 1.0,
        evidence: [docId],
        inference_method: 'extracted',
        status: 'confirmed',
        created_at: `${dateStr}T12:00:00Z`
      });
    }
  }

  // Generate 200 Surveillance notes
  for (let i = 1; i <= 200; i++) {
    const dateStr = `2026-0${randomRange(1, 8)}-${randomRange(10, 28)}`;
    const observer = `Agent ${100 + i}`;
    const city = randomChoice(cities);
    const suspect = generateRandomName();
    
    let text = "";
    if (random() < 0.1) {
      text = `SURVEILLANCE REPORT: Undercover surveillance of Ramesh Patel (suspected money mule, phone: +91 94260 55404) at CP Market. Patel met with Sub-Inspector Vijay Shinde (phone: +91 90040 33606) at a tea stall. Patel handed Shinde an envelope. Later Shinde entered a bank. Suspect Shinde was spotted driving MH-01-AA-0100. Record submitted by ${observer}.`;
    } else {
      text = `Field observation note. Subject ${suspect} was tracked to a commercial block in ${city}. Subject stayed in building for 3 hours, matching meeting schedules. Observed driving vehicle ${generateIndianVehicle()}. Security cameras confirm exit at 17:30.`;
    }

    docs.push({
      id: `doc-surv-${i.toString().padStart(3, '0')}`,
      source_type: 'surveillance',
      title: `Surveillance Entry - ${city} Sector ${i}`,
      raw_text: text,
      file_hash: 'hash-surv-' + i.toString().padStart(3, '0'),
      file_size: text.length,
      mime_type: 'text/plain',
      status: 'processed',
      created_at: `${dateStr}T14:00:00Z`
    });
  }

  // Generate 100 Social Media entries
  for (let i = 1; i <= 100; i++) {
    const dateStr = `2026-0${randomRange(1, 8)}-${randomRange(10, 28)}`;
    const suspectA = generateRandomName();
    const suspectB = generateRandomName();
    
    let text = "";
    if (random() < 0.1) {
      text = `Social Media Intel: Public post from account @VickyJ_Official shows a group photo at a resort in Lonavala. Group photo tagged Vikram Jagtap, Sandeep Yadav, and Arjun Sen (alias Linker). Post text: "Weekend planning with the boys." Comments show replies from accounts linked to Devendra Maurya.`;
    } else {
      text = `OSINT SCAN: Post by User @${suspectA.replace(' ', '')} contains photo with @${suspectB.replace(' ', '')} at a cafe in Mumbai. Image caption mentions mutual business partnerships. Location tag: Marine Drive.`;
    }

    docs.push({
      id: `doc-social-${i.toString().padStart(3, '0')}`,
      source_type: 'social_media',
      title: `OSINT Intelligence Log #${800 + i}`,
      raw_text: text,
      file_hash: 'hash-social-' + i.toString().padStart(3, '0'),
      file_size: text.length,
      mime_type: 'text/plain',
      status: 'processed',
      created_at: `${dateStr}T16:00:00Z`
    });
  }

  // Generate 150 Criminal History records
  for (let i = 1; i <= 150; i++) {
    const suspect = generateRandomName();
    
    let text = "";
    if (i === 1) {
      text = `CRIMINAL HISTORY dossier for Devendra Maurya (Don). Subject is wanted in 14 cases of organized extortion, narcotics trafficking, and cross-border laundering. Identified as primary operator of the Maurya Cartel. Historical associates: Vikram Jagtap (Vicky) and Sandeep Yadav. Threat index: Extreme.`;
    } else if (i === 2) {
      text = `CRIMINAL RECORD: Sandeep Yadav (Sandy). Arrested in 2022 for illicit weapon possession in UP. Arrested in 2024 for smuggling syndication. Currently on bail. Known contacts include Arjun Sen (Broker) and Devendra Maurya.`;
    } else {
      text = `CRIMINAL SUMMARY: Subject ${suspect}. Arrest record shows past bookings under Section 379 IPC (Theft) and Section 420 IPC (Cheating). Total convictions: 1. Habitual offender index: Medium. Home address listed in Delhi.`;
    }

    docs.push({
      id: `doc-crim-${i.toString().padStart(3, '0')}`,
      source_type: 'criminal_history',
      title: `State Criminal Record - Dossier #${2000 + i}`,
      raw_text: text,
      file_hash: 'hash-crim-' + i.toString().padStart(3, '0'),
      file_size: text.length,
      mime_type: 'text/plain',
      status: 'processed',
      created_at: `2026-01-05T09:00:00Z`
    });
  }

  // C. GENERATE 10,000 CALL DETAIL RECORDS (CDRs)
  // Structuring the call graph:
  // Cell A: Vikram Jagtap (lt-01) is the hub. 7 peripherals call Jagtap. Jagtap calls Maurya (Kingpin).
  // Cell B: Sandeep Yadav (lt-02) is the hub. 8 peripherals call Yadav.
  // Arjun Sen (bk-01) is the ONLY link. Arjun Sen has calls ONLY to Vikram Jagtap and Sandeep Yadav.
  console.log("Generating 10,000 Call Detail Records...");
  const cdrs = [];

  const targetJagtapPhone = "+91 98200 77102"; // Vikram Jagtap
  const targetYadavPhone = "+91 95600 66303"; // Sandeep Yadav
  const targetMauryaPhone = "+91 99100 88201"; // Maurya (Kingpin)
  const targetBrokerPhone = "+91 98300 44505"; // Arjun Sen (Broker)
  const targetMulePhone = "+91 94260 55404"; // Ramesh Patel (Mule)
  const targetInsiderPhone = "+91 90040 33606"; // Vijay Shinde (Insider)
  const targetBurner = "+91 98111 00001"; // Sanjay Dutt (Burner phone)
  const targetDormant = "+91 98111 00014"; // Prem Chopra (Dormant-then-active)

  // Cell A Peripherals (pm-01 to pm-07)
  const cellAPhones = [
    "+91 98111 00001", // pm-01 (Sanjay Dutt)
    "+91 98111 00002", // pm-02
    "+91 98111 00003", // pm-03
    "+91 98111 00004", // pm-04
    "+91 98111 00005", // pm-05
    "+91 98111 00006", // pm-06
    "+91 98111 00007"  // pm-07
  ];

  // Cell B Peripherals (pm-08 to pm-15)
  const cellBPhones = [
    "+91 98111 00008", // pm-08
    "+91 98111 00009", // pm-09
    "+91 98111 00010", // pm-10
    "+91 98111 00011", // pm-11
    "+91 98111 00012", // pm-12
    "+91 98111 00013", // pm-13
    "+91 98111 00014", // pm-14
    "+91 98111 00015"  // pm-15
  ];

  // Generate 80 background numbers
  const bgPhones = [];
  for (let i = 0; i < 80; i++) {
    bgPhones.push(generateIndianPhone());
  }

  // Loop to generate 10,000 calls
  for (let i = 1; i <= 10000; i++) {
    const recordId = `cdr-${i.toString().padStart(5, '0')}`;
    let caller, callee, timestamp, duration, tower;
    
    const roll = random();

    if (roll < 0.15) {
      // Cell A Internal communications (Random calls within Cell A to form a dense clique)
      caller = randomChoice(cellAPhones);
      callee = randomChoice([targetJagtapPhone, ...cellAPhones]);
      while (caller === callee) {
        callee = randomChoice([targetJagtapPhone, ...cellAPhones]);
      }
      // Sanjay Dutt burner phone pattern active only 4 days
      if (caller === targetBurner) {
        const day = randomRange(1, 5);
        timestamp = `2026-04-0${day}T${randomRange(10, 22).toString().padStart(2, '0')}:${randomRange(10, 59).toString().padStart(2, '0')}:00Z`;
      } else {
        timestamp = `2026-0${randomRange(2, 7)}-${randomRange(10, 28)}T${randomRange(9, 21).toString().padStart(2, '0')}:${randomRange(10, 59).toString().padStart(2, '0')}:00Z`;
      }
      duration = randomRange(15, 180);
      tower = "TOWER-DEL-CONN-01";
    } else if (roll < 0.30) {
      // Cell B Internal communications (Random calls within Cell B to form a dense clique)
      caller = randomChoice(cellBPhones);
      callee = randomChoice([targetYadavPhone, ...cellBPhones]);
      while (caller === callee) {
        callee = randomChoice([targetYadavPhone, ...cellBPhones]);
      }
      // Dormant then active pattern for pm-14 (Prem Chopra)
      if (caller === targetDormant) {
        const day = randomRange(15, 20);
        timestamp = `2026-05-${day}T${randomRange(0, 23).toString().padStart(2, '0')}:${randomRange(10, 59).toString().padStart(2, '0')}:00Z`;
      } else {
        timestamp = `2026-0${randomRange(2, 7)}-${randomRange(10, 28)}T${randomRange(9, 21).toString().padStart(2, '0')}:${randomRange(10, 59).toString().padStart(2, '0')}:00Z`;
      }
      duration = randomRange(20, 150);
      tower = "TOWER-UP-LKO-02";
    } else if (roll < 0.38) {
      // Cell A Lieutenant reporting to Kingpin
      caller = targetJagtapPhone;
      callee = targetMauryaPhone;
      timestamp = `2026-0${randomRange(2, 7)}-${randomRange(10, 28)}T${randomRange(8, 22).toString().padStart(2, '0')}:${randomRange(10, 59).toString().padStart(2, '0')}:00Z`;
      duration = randomRange(60, 500);
      tower = "TOWER-DEL-CONN-03";
    } else if (roll < 0.45) {
      // Broker connecting the cells: Arjun Sen speaks ONLY to Vicky Jagtap and Sandy Yadav
      const brokerPair = randomChoice([
        [targetBrokerPhone, targetJagtapPhone],
        [targetBrokerPhone, targetYadavPhone]
      ]);
      caller = brokerPair[0];
      callee = brokerPair[1];
      timestamp = `2026-0${randomRange(2, 7)}-${randomRange(10, 28)}T${randomRange(8, 22).toString().padStart(2, '0')}:${randomRange(10, 59).toString().padStart(2, '0')}:00Z`;
      duration = randomRange(45, 300);
      tower = "TOWER-DEL-OUTER-09";
    } else if (roll < 0.47) {
      // Communication spike pattern: Vicky Jagtap calling pm-02 45 times in 1 day
      caller = targetJagtapPhone;
      callee = cellAPhones[1];
      timestamp = `2026-05-10T${randomRange(12, 23).toString().padStart(2, '0')}:${randomRange(10, 59).toString().padStart(2, '0')}:00Z`;
      duration = randomRange(10, 90);
      tower = "TOWER-DEL-CONN-01";
    } else if (roll < 0.49) {
      // Unusual hours pattern: pm-12 (Amrish Puri) calling Yadav at 02:30 AM (both inside Cell B)
      caller = "+91 98111 00012";
      callee = targetYadavPhone;
      timestamp = `2026-06-${randomRange(10, 28)}T02:${randomRange(10, 45).toString().padStart(2, '0')}:00Z`;
      duration = randomRange(120, 240);
      tower = "TOWER-DEL-WEST-11";
    } else {
      // Background noise calls: isolated from our cartel clusters
      // We partition background numbers into small separated subsets so they don't form a highly-connected core
      const subsetId = randomRange(0, 8); // 8 isolated groups
      const subsetSize = 10;
      const subsetStart = subsetId * subsetSize;
      
      caller = bgPhones[subsetStart + randomRange(0, 5)];
      callee = bgPhones[subsetStart + randomRange(5, 10)];
      
      timestamp = `2026-0${randomRange(1, 8)}-${randomRange(10, 28)}T${randomRange(8, 23).toString().padStart(2, '0')}:${randomRange(10, 59).toString().padStart(2, '0')}:00Z`;
      duration = randomRange(10, 120);
      tower = `TOWER-BG-TOWN-${subsetId}`;
    }

    cdrs.push({
      id: recordId,
      caller,
      callee,
      timestamp,
      duration,
      tower_id: tower
    });

    // Seed relationship communication links in DB
    const callerEnt = addEntity(caller, 'phone');
    const calleeEnt = addEntity(callee, 'phone');
    
    // Find existing relationship or add new
    const relKey = `${callerEnt.id}-${calleeEnt.id}`;
    const reverseKey = `${calleeEnt.id}-${callerEnt.id}`;
    let matchRel = relationships.find(r => r.source_entity_id === callerEnt.id && r.target_entity_id === calleeEnt.id);
    if (!matchRel) {
      matchRel = relationships.find(r => r.source_entity_id === calleeEnt.id && r.target_entity_id === callerEnt.id);
    }

    if (matchRel) {
      matchRel.occurrence_count += 1;
      matchRel.weight += 0.2;
      matchRel.last_seen = timestamp;
    } else {
      relationships.push({
        id: 'rel-' + (relationships.length + 1).toString().padStart(5, '0'),
        source_entity_id: callerEnt.id,
        target_entity_id: calleeEnt.id,
        relation_type: 'called',
        weight: 1.0,
        confidence: 1.0,
        first_seen: timestamp,
        last_seen: timestamp,
        occurrence_count: 1,
        evidence: [],
        inference_method: 'extracted',
        status: 'confirmed',
        created_at: new Date().toISOString()
      });
    }
  }

  // D. GENERATE 3,000 FINANCIAL TRANSACTIONS
  console.log("Generating 3,000 Financial Transactions...");
  const txs = [];
  
  // Set up accounts
  const targetMuleAcct = "2020044505"; // Ramesh Patel (Mule)
  const targetShindeAcct = "1010099206"; // Vijay Shinde (Insider)
  const targetMauryaAcct = "1010099201"; // Maurya (Kingpin)

  const bgAccounts = [];
  for (let i = 0; i < 40; i++) {
    const details = generateIFSCAndAccount();
    bgAccounts.push(details.accountNumber);
    addEntity(details.accountNumber, 'bank_account', { ifsc: details.ifsc, bank: details.bank });
  }

  for (let i = 1; i <= 3000; i++) {
    const txId = `tx-${i.toString().padStart(4, '0')}`;
    let sender, recipient, amount, timestamp, bank, ifsc;
    
    const roll = random();

    if (roll < 0.05) {
      // 1. Structuring pattern: Ramesh Patel transfers ₹49,500 to Arjun Sen, who passes it to Shinde
      const toggle = randomRange(0, 2);
      if (toggle === 0) {
        sender = targetMuleAcct;
        recipient = "1010099205"; // Arjun Sen
      } else {
        sender = "1010099205";
        recipient = targetShindeAcct; // Vijay Shinde
      }
      amount = 49500;
      timestamp = `2026-06-12T11:${randomRange(10, 59).toString().padStart(2, '0')}:00Z`;
      bank = "SBI";
      ifsc = "SBIN0000404";
    } else if (roll < 0.10) {
      // 2. Circular Flow pattern: Maurya -> Ramesh Patel -> Arjun Sen -> Vijay Shinde -> Maurya
      const cycle = randomRange(0, 4);
      if (cycle === 0) {
        sender = targetMauryaAcct;
        recipient = targetMuleAcct;
        amount = 120000;
      } else if (cycle === 1) {
        sender = targetMuleAcct;
        recipient = "1010099205"; // Arjun Sen
        amount = 115000;
      } else if (cycle === 2) {
        sender = "1010099205";
        recipient = targetShindeAcct;
        amount = 110000;
      } else {
        sender = targetShindeAcct;
        recipient = targetMauryaAcct;
        amount = 100000;
      }
      timestamp = `2026-06-15T${randomRange(9, 15).toString().padStart(2, '0')}:${randomRange(10, 59).toString().padStart(2, '0')}:00Z`;
      bank = "HDFC";
      ifsc = "HDFC0000101";
    } else if (roll < 0.15) {
      // 3. Rapid pass-through: Ramesh Patel receives ₹10,00,000 from Maurya, passes it out in ₹2,00,000 batches
      sender = targetMauryaAcct;
      recipient = targetMuleAcct;
      amount = 1000000;
      timestamp = `2026-07-20T14:00:00Z`;
      bank = "HDFC";
      ifsc = "HDFC0000101";

      txs.push({
        id: `tx-pass-${i}-out1`,
        sender: targetMuleAcct,
        recipient: randomChoice(bgAccounts),
        amount: 200000,
        timestamp: `2026-07-20T14:15:00Z`,
        bank: "SBI",
        ifsc: "SBIN0000404"
      });
      txs.push({
        id: `tx-pass-${i}-out2`,
        sender: targetMuleAcct,
        recipient: randomChoice(bgAccounts),
        amount: 200000,
        timestamp: `2026-07-20T14:30:00Z`,
        bank: "SBI",
        ifsc: "SBIN0000404"
      });
    } else {
      // 4. Background transactions (isolated in background groups)
      const subsetId = randomRange(0, 4);
      const start = subsetId * 10;
      sender = bgAccounts[start + randomRange(0, 5)];
      recipient = bgAccounts[start + randomRange(5, 10)];
      amount = randomRange(1000, 30000);
      timestamp = `2026-0${randomRange(1, 8)}-${randomRange(10, 28)}T${randomRange(9, 17).toString().padStart(2, '0')}:${randomRange(10, 59).toString().padStart(2, '0')}:00Z`;
      const info = generateIFSCAndAccount();
      bank = info.bank;
      ifsc = info.ifsc;
    }

    txs.push({
      id: txId,
      sender,
      recipient,
      amount,
      timestamp,
      bank,
      ifsc
    });

    // Seed relationship mapping from bank transactions
    const senderEnt = addEntity(sender, 'bank_account');
    const recEnt = addEntity(recipient, 'bank_account');
    relationships.push({
      id: 'rel-' + (relationships.length + 1).toString().padStart(5, '0'),
      source_entity_id: senderEnt.id,
      target_entity_id: recEnt.id,
      relation_type: 'transacted_with',
      weight: Math.round((amount / 10000) * 10) / 10 || 1.0,
      confidence: 1.0,
      first_seen: timestamp,
      last_seen: timestamp,
      occurrence_count: 1,
      evidence: [],
      inference_method: 'extracted',
      status: 'confirmed',
      created_at: new Date().toISOString()
    });
  }

  // E. PLANT ALL 12 SUSPICIOUS ALERTS MATCHING SPECIFICATIONS
  console.log("Planting all 12 suspicious alert configurations...");

  const alertList = [
    { type: "structuring", severity: "high", title: "Structuring cash transfer bypass match", exp: "Ramesh Patel transferred multiple transactions of ₹49,500 to sub-inspector Vijay Shinde within 2 hours, bypassing the ₹50,000 PAN limit." },
    { type: "burner_phone", severity: "medium", title: "Burner SIM card active lifespan alert", exp: "Device registered to Sanjay Dutt (+91 98111 00001) was active for only 4 days and dedicated 90% of its calls exclusively to lieutenant Vikram Jagtap." },
    { type: "communication_spike", severity: "medium", title: "Cartel communication surge alert", exp: "Sudden spike of 45 calls detected between Vikram Jagtap and Sandeep Yadav on 2026-05-10." },
    { type: "bridge_node", severity: "high", title: "Broker/Bridge connection node alert", exp: "Arjun Sen identified as a critical network broker linking separate cartel groups while maintaining very low direct link counts." },
    { type: "circular_money_flow", severity: "critical", title: "Circular flow of funds alert", exp: "Funds originating from Devendra Maurya's account flow through Ramesh Patel to Sub-Inspector Shinde and return to Maurya's account." },
    { type: "rapid_pass_through", severity: "critical", title: "Rapid pass-through cash flow alert", exp: "Ramesh Patel's bank account received ₹10,00,000 from Devendra Maurya and immediately dispatched ₹2,00,000 batches within 45 minutes." },
    { type: "geographic_co_location", severity: "medium", title: "Geographical co-location overlap alert", exp: "Devendra Maurya and Vikram Jagtap were detected registered on the CP cell tower TOWER-DEL-CONN-01 at the same timestamps." },
    { type: "dormant_then_active", severity: "medium", title: "Dormant SIM card activation alert", exp: "SIM card linked to Prem Chopra (+91 98111 00014) dormant for 120 days suddenly placed 145 calls in 48 hours." },
    { type: "shared_identifier", severity: "high", title: "Shared phone number identity alert", exp: "Danny Denzongpa and Shakti Kapoor share the same phone number +91 98111 00010 across different police case logs." },
    { type: "unusual_hours", severity: "low", title: "Atypical hours activity alert", exp: "Amrish Puri placed bank transfers and cellular calls exclusively between 01:00 AM and 03:30 AM." },
    { type: "network_growth_anomaly", severity: "medium", title: "Abnormal contact list growth alert", exp: "Sunil Shetty added 42 unique phone contacts in a 24-hour window." },
    { type: "community_bridging", severity: "high", title: "Multi-community overlap link alert", exp: "Arjun Sen maintains relationships linking Delhi Cartel, UP Cartel, and financial mule networks." }
  ];

  alertList.forEach((al, idx) => {
    alerts.push({
      id: `alt-${(idx + 1).toString().padStart(3, '0')}`,
      alert_type: al.type,
      severity: al.severity,
      title: al.title,
      explanation: al.exp,
      entity_ids: [gtEntities["Devendra Maurya"]?.id, gtEntities["Vikram Jagtap"]?.id, gtEntities["Arjun Sen"]?.id].filter(Boolean),
      evidence: [],
      confidence: 0.90,
      status: "new",
      detected_at: new Date().toISOString()
    });
  });

  // F. RESOLVE DUPLICATES TEST ENTITIES
  // Add variants to simulate duplicates database mapping
  entities.push({
    id: 'ent-dup-01',
    entity_type: 'person',
    canonical_name: 'Rajesh Kumaar',
    aliases: [],
    attributes: { phone: '+91 99100 88201' }, // Exact phone match resolves to Devendra Maurya
    risk_score: 0,
    risk_breakdown: {},
    is_verified: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  entities.push({
    id: 'ent-dup-02',
    entity_type: 'person',
    canonical_name: 'R. Maurya',
    aliases: [],
    attributes: { phone: '+91 99100 88201' }, // Exact phone match resolves to Devendra Maurya
    risk_score: 0,
    risk_breakdown: {},
    is_verified: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  // F. SAVE DATABASE SCHEMA TO mock_database.json
  const finalSchema = {
    documents: docs,
    entities,
    relationships,
    alerts,
    entity_metrics: [],
    cases: [
      {
        id: "c-01",
        case_number: "FIR-2026-DEL-092",
        title: "Maurya Drug Syndicate Operations",
        description: "Investigation into cross-border drug distribution and money laundering channels led by Devendra Maurya.",
        status: "active",
        priority: "critical",
        assigned_to: "investigator@agency.gov.in",
        opened_at: "2026-03-12T10:00:00Z",
        created_at: "2026-03-12T10:00:00Z"
      }
    ],
    audit_logs: []
  };

  const outputFilePath = path.join(__dirname, 'mock_database.json');
  fs.writeFileSync(outputFilePath, JSON.stringify(finalSchema, null, 2), 'utf8');
  console.log(`Successfully generated and wrote database seeds to: ${outputFilePath}`);
  console.log(`Generated entities count: ${entities.length}`);
  console.log(`Generated relationships count: ${relationships.length}`);
  console.log(`Generated documents count: ${docs.length}`);
}

generate();
