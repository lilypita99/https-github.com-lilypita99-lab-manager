# Lab Manager App

This project contains a prototype Lab Manager web application built with React (frontend) and Flask (backend).

## Backend
- `lab_manager/backend/app.py` — Flask application entrypoint
- `lab_manager/backend/routes.py` — API endpoints for inventory management
- `lab_manager/backend/models.py` — SQLAlchemy models for inventory items
- `lab_manager/backend/requirements.txt` — Python dependencies

### Run backend
```bash
cd lab_manager/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py
```

### Quick backend start (recommended)
```bash
cd lab_manager
./run_backend.sh
```

## Frontend
- `lab_manager/frontend/package.json` — React app dependencies
- `lab_manager/frontend/src/App.js` — main React component
- `lab_manager/frontend/src/components/Inventory.js` — inventory UI
- `lab_manager/frontend/src/index.js` — React entrypoint

### Run frontend
```bash
cd lab_manager/frontend
npm install
npm start
```

### Quick frontend start (recommended)
```bash
cd lab_manager
./run_frontend.sh
```

## Manager View Filters
- `All Items`: full inventory table
- `Needs to Order`: only items where computed need (`desired - actual`) is greater than 0
- `In Process`: items already marked as ordered and currently waiting to arrive

## Ordering Workflow
1. In `Needs to Order`, click `Ordered` to move an item to `In Process` and capture the order date.
2. In `In Process`, click `It Came` when stock arrives.
3. `It Came` adds the in-process quantity to current inventory and recalculates need automatically.
