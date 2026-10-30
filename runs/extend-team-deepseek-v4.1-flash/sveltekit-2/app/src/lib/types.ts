// Shapes shared between the server data layer and the components.

export type TypeRef = { name: string; label: string };

export type Card = { id: number; name: string; sprite: string; types?: TypeRef[]; hidden?: boolean };

export type EvolutionNode = { name: string; children: EvolutionNode[] };

export type MoveRow = {
	level: number | null;
	name: string;
	label: string;
	type: TypeRef;
	category: string | null;
	power: number | null;
	accuracy: number | null;
	pp: number | null;
};

export type MoveTable = { method: string; label: string; rows: MoveRow[] };
