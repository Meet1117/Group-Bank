import { Routes, Route, Navigate } from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute.jsx";

import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import CreateRoom from "./pages/CreateRoom.jsx";
import JoinRoom from "./pages/JoinRoom.jsx";
import Profile from "./pages/Profile.jsx";
import Notifications from "./pages/Notifications.jsx";
import Room from "./pages/Room.jsx";
import DepositPage from "./pages/DepositPage.jsx";
import ExpensePage from "./pages/ExpensePage.jsx";
import Chat from "./pages/Chat.jsx";
import Requests from "./pages/Requests.jsx";

export default function App() {
  // NOTE: No route-level <AnimatePresence> here. Wrapping <Routes> in
  // AnimatePresence mode="wait" can deadlock navigation when a page uses
  // shared layout animations (layoutId) or nested AnimatePresence — the URL
  // changes but the old page never finishes exiting, so it stays mounted.
  // Each page animates itself on mount, so transitions still feel smooth.
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />

      {/* Protected — ProtectedRoute renders <Layout/> wrapping <Outlet/> */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/create" element={<CreateRoom />} />
        <Route path="/join" element={<JoinRoom />} />
        <Route path="/join/:code" element={<JoinRoom />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/room/:id" element={<Room />} />
        <Route path="/room/:id/deposit" element={<DepositPage />} />
        <Route path="/room/:id/expense" element={<ExpensePage />} />
        <Route path="/room/:id/chat" element={<Chat />} />
        <Route path="/room/:id/requests" element={<Requests />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
