import { Link } from "react-router";
import { humanize } from "~/lib/format";

export type EvolutionNode = {
  name: string;
  children: EvolutionNode[];
};

export function EvolutionTree({ node }: { node: EvolutionNode }) {
  return (
    <ul className="evolution-tree">
      <EvolutionItem node={node} />
    </ul>
  );
}

function EvolutionItem({ node }: { node: EvolutionNode }) {
  return (
    <li>
      <Link to={`/pokemon/${node.name}`}>{humanize(node.name)}</Link>
      {node.children.length ? (
        <ul>
          {node.children.map((child) => (
            <EvolutionItem key={child.name} node={child} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}
