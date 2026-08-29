# REST API Reference

This document describes the REST API endpoints exposed by the Kraken CNA Next.js server.

## 1. Demo & Seeding Operations

### Load Demo Cartel Database
Seeds the local Mock DB or Supabase tables with the deterministic structured cartel graph and alerts.
- **URL:** `/api/demo/load`
- **Method:** `POST`
- **Response:**
  ```json
  {
    "success": true,
    "message": "Demo cartel loaded successfully.",
    "entitiesCount": 672,
    "relationshipsCount": 3680,
    "documentsCount": 750
  }
  ```

### Reset Database
Wipes all entries from documents, entities, relationships, alerts, and metrics tables.
- **URL:** `/api/demo/reset`
- **Method:** `POST`
- **Response:**
  ```json
  {
    "success": true,
    "message": "Database wiped successfully."
  }
  ```

## 2. Graph Analytics Operations

### Recompute Centrality Metrics
Recomputes PageRank, Betweenness Centrality, Closeness, and Louvain partitions, caching results in the database.
- **URL:** `/api/graph/recompute`
- **Method:** `POST`
- **Response:**
  ```json
  {
    "success": true,
    "message": "Graph analytics centrality metrics recomputed successfully.",
    "nodesProcessed": 21,
    "communitiesFound": 3,
    "bridgesCount": 4,
    "cutVerticesCount": 3,
    "lastComputedAt": "2026-08-27T12:00:00Z"
  }
  ```

### Find Shortest Connection Paths
Finds the chain of links connecting any two suspect names.
- **URL:** `/api/graph/path`
- **Method:** `GET`
- **Query Parameters:**
  - `source` = "Vikram Jagtap"
  - `target` = "Sandeep Yadav"
  - `maxHops` = 4
- **Response:**
  ```json
  {
    "success": true,
    "source": "Vikram Jagtap",
    "target": "Sandeep Yadav",
    "paths": [
      ["Vikram Jagtap", "Arjun Sen", "Sandeep Yadav"]
    ]
  }
  ```

### Get Link Predictions
Returns the top 15 predicted connections based on Adamic-Adar scores.
- **URL:** `/api/graph/predict`
- **Method:** `GET`
- **Response:**
  ```json
  {
    "success": true,
    "predictions": [
      {
        "source": { "id": "ent-001", "canonical_name": "Sanjay Dutt" },
        "target": { "id": "ent-002", "canonical_name": "Devendra Maurya" },
        "score": 1.45,
        "common_neighbors": ["Vikram Jagtap"]
      }
    ]
  }
  ```
