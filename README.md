# Cost Per Day

A progressive web application that helps you track the daily cost of your purchased items across their ownership lifecycle. Active items use the current date, while retired, sold, or lost items keep a frozen final cost per day based on their recorded ownership end date.

<div style="text-align: center;">
  <img src="./public/preview.png" alt="drawing" width="200"/>
</div>

## Features

- **Lifecycle-Aware Daily Cost**: Calculates current cost per day for active items and freezes final cost per day when an item is retired, sold, or lost
- **Sold Item Net Cost**: Tracks sale price, net ownership cost, and net cost per day for sold items
- **Total Daily Cost**: Shows the combined current daily cost of active items at a glance
- **Item Management**: 
  - Add new items with name, price, and purchase date
  - Edit existing items
  - Delete items with confirmation
- **Google Sign-In**: Uses Google OIDC only for external identity, then keeps application-owned local users and sessions
- **Multi-User Isolation**: Items and settings are scoped to the authenticated local user
- **Data Management**:
  - Export server-backed data to a JSON file
  - Import JSON data back through the shared API
  - Shared SQLite persistence through the Go backend
- **Customization**:
  - Multiple language support (English, French, Chinese, Indonesian)
  - Currency selection (USD, EUR, CNY, IDR)
- **Modern UI/UX**:
  - Responsive design for mobile and desktop
  - Smooth animations and transitions
  - Intuitive navigation
  - Mobile-optimized date picker
  - Progressive Web App capabilities

## Getting Started

### Prerequisites

- Node.js (v22 or higher)
- npm (comes with Node.js)
- Go (v1.25.5 or higher, for backend service)
- *Optional (for backend hot reloading)*: [Air](https://github.com/air-verse/air) v1.65.3:
  ```bash
  go install github.com/air-verse/air@v1.65.3
  ```

### Installation

1. Clone the repository:
```bash
git clone https://github.com/leoli-dev/cost-per-day.git
cd cost-per-day
```

2. Install dependencies:
```bash
npm install
```

3. Start the development environment:
```bash
npm run dev
```

This single command concurrently starts both the Go backend API (`http://127.0.0.1:8080`) and the React frontend (`http://localhost:3000`).
- **With Air installed**: The backend runs with automatic hot reloading on file changes.
- **Without Air**: The development runner automatically falls back to standard `go run ./cmd/server`, keeping fresh checkouts completely functional out of the box.

If you prefer running services in separate terminals:
- **Frontend only**: `npm start`
- **Backend with hot reload**: `npm run server:air` (or `air` in the `backend/` directory)
- **Backend standard**: `npm run server:build` (or `go run ./cmd/server` in the `backend/` directory)

The backend service will listen on `http://127.0.0.1:8080`. Configure the Google OIDC values documented in `backend/.env.example`, including an authorized local callback of `http://localhost:8080/auth/google/callback` and `APP_BASE_URL=http://localhost:3000`. In development, the frontend API client connects to the backend address by default and includes application session cookies. Set `REACT_APP_API_BASE_URL` to override it when the backend is hosted elsewhere. Production builds default to same-origin requests.

### Building for Production

To create a production build:

```bash
npm run build
```

The build files will be created in the `build` folder.

## Production Self-Hosting

The production Docker image contains both the Go backend and the compiled React frontend. The backend serves the SPA and API from the same origin, while SQLite is expected to live on a persistent mount outside the container filesystem.

See [docs/production.md](./docs/production.md) for the supported single-VPS topology, HTTPS requirements, persistent-volume permissions, backup/restore steps, upgrade behavior, and the remaining Google OIDC dependency.

## How to Use

### Adding Items
1. Click the "+" icon in the bottom navigation
2. Enter the item name
3. Input the purchase price
4. Select the purchase date using the date picker
5. Click "Save"

### Viewing Items
1. The home screen displays active and historical items with their current or final daily cost
2. The total daily cost at the top includes active items only
3. Retired, sold, and lost items remain visible with frozen final ownership metrics
4. Click on any item to expand and see details

### Editing Items
1. Click on an item to expand it
2. Click the "Edit" button
3. Modify the details as needed
4. Click "Save" to update

### Deleting Items
1. Navigate to the edit page of an item
2. Click the "Delete Item" button
3. Confirm the deletion in the popup dialog

### Managing Data
1. Go to the Settings page by clicking the gear icon
2. Under "Data Management":
   - Click "Export Data" to download your data as a JSON file
   - Click "Import Data" to upload a previously exported JSON file

### Changing Settings
1. Go to the Settings page
2. Change language: Select from English, French, Chinese, or Bahasa Indonesia
3. Change currency: Select from USD ($), EUR (€), CNY (¥), or IDR (Rp)

## Technologies Used

- **Frontend**: React, React Router
- **State Management**: React Context API
- **Styling**: Tailwind CSS
- **Storage**: SQLite behind the shared Go API
- **Internationalization**: i18next
- **Icons**: React Icons

## Browser Support

The application works on all modern browsers including:
- Chrome (and Chromium-based browsers)
- Firefox
- Safari
- Edge

## Mobile Support

The app is designed with a mobile-first approach and includes:
- Touch-friendly interface
- Native date picker on mobile devices
- Responsive layout for all screen sizes
- PWA support for installation on home screen

## License

This project is licensed under the MIT License - see the LICENSE file for details.
