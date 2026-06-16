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
import { frontendPalette } from "../theme";

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
    <div className="grid gap-1">
      <ButtonBase
        aria-expanded={open}
        sx={{
          alignItems: "center",
          backgroundColor: active
            ? "rgba(216, 183, 105, 0.18)"
            : "rgba(255, 255, 255, 0.055)",
          borderRadius: 3,
          color: active ? "#ffffff" : "rgba(255, 255, 255, 0.72)",
          display: "flex",
          fontSize: 12,
          fontWeight: 800,
          justifyContent: "space-between",
          letterSpacing: 0,
          px: 1.5,
          py: 1.5,
          textAlign: "left",
          textTransform: "uppercase",
          transition: "background-color 160ms ease, color 160ms ease",
          width: "100%",
          "&:hover": {
            backgroundColor: "rgba(216, 183, 105, 0.18)",
            color: "#ffffff",
          },
          "&:focus-visible": {
            outline: `2px solid ${frontendPalette.accentGold}`,
            outlineOffset: 2,
          },
        }}
        onClick={onToggle}
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
            style={{
              backgroundColor: active
                ? frontendPalette.accentGold
                : "rgba(255, 255, 255, 0.09)",
              color: active ? frontendPalette.primaryNavy : "#ffffff",
            }}
          >
            {icon}
          </span>
          <span className="truncate">{title}</span>
        </span>
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </ButtonBase>
      <Collapse in={open} timeout="auto" unmountOnExit>
        <div className="ml-4 grid gap-1.5 border-l border-white/10 py-1 pl-3">
          {children}
        </div>
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
    <ButtonBase
      aria-current={active ? "page" : undefined}
      sx={{
        alignItems: "center",
        backgroundColor: active ? "#ffffff" : "transparent",
        borderRadius: 2,
        color: active ? frontendPalette.primaryNavy : "rgba(255, 255, 255, 0.72)",
        display: "flex",
        fontSize: 14,
        gap: 1,
        fontWeight: active ? 800 : 600,
        justifyContent: "flex-start",
        minHeight: 38,
        px: 1.5,
        py: 1,
        textAlign: "left",
        transition: "background-color 160ms ease, color 160ms ease",
        width: "100%",
        "&:hover": {
          backgroundColor: active ? "#ffffff" : "rgba(255, 255, 255, 0.08)",
          color: active ? frontendPalette.primaryNavy : "#ffffff",
        },
        "& .nav-child-icon svg": {
          color: active ? "#ffffff" : "rgba(255, 255, 255, 0.82)",
          opacity: 1,
          stroke: "currentColor",
          strokeWidth: active ? 2.6 : 2.2,
        },
        "&:focus-visible": {
          outline: `2px solid ${frontendPalette.accentGold}`,
          outlineOffset: 2,
        },
      }}
      onClick={onClick}
    >
      <span
        className="nav-child-icon flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
        style={{
          backgroundColor: active
            ? frontendPalette.primaryNavy
            : "rgba(255, 255, 255, 0.06)",
          color: active ? "#ffffff" : "rgba(255, 255, 255, 0.8)",
        }}
      >
        {icon}
      </span>
      <span className="truncate">{children}</span>
    </ButtonBase>
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
      severity={kind === "error" ? "error" : "success"}
      variant="outlined"
      sx={{ mt: 2.25 }}
      action={
        <IconButton
          aria-label="Fechar mensagem"
          color="inherit"
          size="small"
          onClick={onClose}
        >
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
        <DialogContentText id="confirmation-dialog-description">
          {message}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onCancel}>
          Voltar
        </Button>
        <Button
          variant="contained"
          color="success"
          onClick={onConfirm}
          autoFocus
        >
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
      className="grid min-h-24 w-full justify-items-start gap-1.5 rounded-2xl border bg-white p-4 text-left transition-transform"
      focusRipple
      sx={{
        borderColor: active ? frontendPalette.accentGold : "#dfe5e1",
        boxShadow: active
          ? "0 12px 26px rgba(32, 52, 102, 0.12)"
          : "0 8px 18px rgba(32, 52, 102, 0.04)",
        color: frontendPalette.darkBase,
        transform: active ? "translateY(-1px)" : "none",
        "&:hover": {
          borderColor: frontendPalette.accentGold,
          boxShadow: "0 12px 26px rgba(32, 52, 102, 0.12)",
          transform: "translateY(-1px)",
        },
        "&:focus-visible": {
          outline: `2px solid ${frontendPalette.accentGold}`,
          outlineOffset: 3,
        },
      }}
      onClick={onClick}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eef1f7] text-[#203466]">
        {icon}
      </span>
      <span className="text-sm text-[#5f665f]">{label}</span>
      <strong className="text-3xl leading-none text-[#2c281e]">{value}</strong>
    </ButtonBase>
  );
}
