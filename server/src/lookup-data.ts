export const lines = ["A", "B", "C", "D", "E", "G"] as const;

export const shifts = ["A", "B", "C"] as const;

export const stages = ["VI-1", "VI-3", "Vacuum", "VI-4"] as const;

export const updatedByList = [
  "LR NAIDU",
  "P.L.SAI KAUSHIK",
  "A.SAI KUMAR",
  "U.SRINIVAS",
  "N.CHAKRADHAR",
  "K.VARMA",
  "ROHINI",
  "S.NARENDRA",
  "S.RAJU"
] as const;

export const stageRejectionTypes = {
  "VI-1": [
    "WEAK WELD",
    "DUST WELD",
    "IMPROPER WELD",
    "QC TORQUE TEST",
    "AIR BUBBLES",
    "DAMAGE",
    "NARROW CHANNEL",
    "ALIGNMENT ISSUE",
    "CHILD PART WELDED",
    "CHILD PART MISSING",
    "HAIR WELDED"
  ],
  "VI-3": ["PEAL OFF", "TEAR OFF", "OVERMELT", "WELDING REJECTIONS"],
  Vacuum: ["SN HIGH", "SN LOW", "EV HIGH", "EN LOW", "EN 4", "EN 6", "QR REJECTIONS"],
  "VI-4": [
    "IMPROPER WELDING",
    "WEAK WELD",
    "DUST WELD",
    "ALIGNMENT ISSUE",
    "DAMAGE",
    "NARROW",
    "OVERMELT"
  ]
} as const;

export const lineEquipments = {
  A: ["EC/EQID/III-00631", "EC/EQID/III-00163"],
  B: ["EC/EQID/III-00572", "EC/EQID/III-00133"],
  C: ["EC/EQID/III-00069", "EC/EQID/III-00101"],
  D: ["EC/EQID/III-00003", "EC/EQID/III-00633"],
  E: ["EC/EQID/III-00036", "EC/EQID/III-00632"],
  G: ["EC/EQID/III-00659"]
} as const;

export type Line = (typeof lines)[number];
export type Shift = (typeof shifts)[number];
export type Stage = (typeof stages)[number];
export type UpdatedBy = (typeof updatedByList)[number];
export type StageRejectionTypeMap = typeof stageRejectionTypes;
