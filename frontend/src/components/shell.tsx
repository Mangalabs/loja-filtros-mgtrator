import MuiAlert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import ButtonBase from "@mui/material/ButtonBase";
import Collapse from "@mui/material/Collapse";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import { ChevronDown, ChevronRight, X } from "lucide-react";
import type { ReactNode } from "react";

export function NavSection({
  active,
  children,
  icon,
  open,
  title,
  onToggle,
}: {
  active: boolean;
  children: ReactNode;
  icon: ReactNode;
  open: boolean;
  title: string;
  onToggle: () => void;
}) {
  return (
    <div className="nav-section">
      <button
        aria-expanded={open}
        className={active ? "nav-section-trigger active" : "nav-section-trigger"}
        type="button"
        onClick={onToggle}
      >
        <span className="nav-section-title">
          {icon}
          {title}
        </span>
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </button>
      <Collapse in={open} timeout="auto" unmountOnExit>
        <div className="nav-section-items">{children}</div>
      </Collapse>
    </div>
  );
}

export function NavButton({
  active,
  children,
  icon,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      aria-current={active ? "page" : undefined}
      className={active ? "nav-item active" : "nav-item"}
      type="button"
      onClick={onClick}
    >
      {icon}
      {children}
    </button>
  );
}

export function AppMessage({
  kind,
  message,
  onClose,
}: {
  kind: "error" | "success";
  message: string;
  onClose: () => void;
}) {
  return (
    <MuiAlert
      className="app-message"
      severity={kind === "error" ? "error" : "success"}
      variant="outlined"
      action={
        <IconButton aria-label="Fechar mensagem" color="inherit" size="small" onClick={onClose}>
          <X size={16} />
        </IconButton>
      }
    >
      {message}
    </MuiAlert>
  );
}

export function ConfirmationDialog({
  confirmLabel,
  message,
  open,
  title,
  onCancel,
  onConfirm,
}: {
  confirmLabel: string;
  message: string;
  open: boolean;
  title: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      aria-labelledby="confirmation-dialog-title"
      aria-describedby="confirmation-dialog-description"
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle id="confirmation-dialog-title">{title}</DialogTitle>
      <DialogContent>
        <DialogContentText id="confirmation-dialog-description">{message}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onCancel}>
          Voltar
        </Button>
        <Button variant="contained" color="success" onClick={onConfirm} autoFocus>
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function Metric({
  active,
  icon,
  label,
  value,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  value: number;
  onClick: () => void;
}) {
  return (
    <ButtonBase
      className={active ? "metric metric-button active" : "metric metric-button"}
      focusRipple
      onClick={onClick}
    >
      <span className="metric-icon">{icon}</span>
      <span className="metric-label">{label}</span>
      <strong>{value}</strong>
    </ButtonBase>
  );
}
