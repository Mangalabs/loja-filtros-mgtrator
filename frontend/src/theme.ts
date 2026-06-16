import { createTheme } from '@mui/material/styles'

export const frontendPalette = {
  accentGold: '#d8b769',
  darkBase: '#2c281e',
  mutedBlueGray: '#848eb4',
  mutedGreenGray: '#8a9f9d',
  primaryNavy: '#203466',
} as const

export const theme = createTheme({
  cssVariables: true,
  palette: {
    background: {
      default: '#f7f7f4',
      paper: '#ffffff',
    },
    error: {
      main: '#9f3a2c',
    },
    info: {
      main: frontendPalette.mutedBlueGray,
    },
    primary: {
      main: frontendPalette.primaryNavy,
    },
    secondary: {
      contrastText: frontendPalette.darkBase,
      main: frontendPalette.accentGold,
    },
    success: {
      main: '#2f6f55',
    },
    text: {
      primary: frontendPalette.darkBase,
      secondary: '#5f665f',
    },
    warning: {
      main: frontendPalette.accentGold,
    },
  },
  shape: {
    borderRadius: 10,
  },
  typography: {
    fontFamily: [
      'Inter',
      'ui-sans-serif',
      'system-ui',
      '-apple-system',
      'BlinkMacSystemFont',
      'Segoe UI',
      'sans-serif',
    ].join(','),
  },
  components: {
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          fontWeight: 700,
          textTransform: 'none',
        },
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#f7f7f4',
          color: frontendPalette.darkBase,
          overflowX: 'hidden',
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: '#fbfcfb',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        fullWidth: true,
        size: 'small',
      },
    },
  },
})
