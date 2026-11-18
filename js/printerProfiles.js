export const PRINTER_PROFILES = {
    generic: {
        name: "Genérica ESC/POS (Estándar)",
        init: [0x1B, 0x40],
        codePage: [0x1B, 0x74, 0x13], // CP858
        cut: [0x1D, 0x56, 0x00],      // Corte total
        feed: [0x1B, 0x64, 0x04]      // Avanzar 4 líneas
    },
    epson: {
        name: "Epson / TM Series",
        init: [0x1B, 0x40],
        codePage: [0x1B, 0x74, 0x13],
        cut: [0x1D, 0x56, 0x42, 0x00], // Corte con avance integrado
        feed: [0x1B, 0x64, 0x04]
    },
    xprinter: {
        name: "Xprinter / Goojprt (POS)",
        init: [0x1B, 0x40],
        codePage: [0x1B, 0x74, 0x13],
        cut: [0x1D, 0x56, 0x01],      // Corte parcial (recomendado para rollos continuos)
        feed: [0x1B, 0x64, 0x04]
    }
};