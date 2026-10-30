export type TypeInfo = { name: string; label: string };

export type Card = {
  id: number;
  name: string;
  label: string;
  sprite: string;
  types?: TypeInfo[];
  hidden?: boolean;
};
