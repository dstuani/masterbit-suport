import { Card, CardContent } from "@/components/ui/card";

/** Marcador das telas ainda não implementadas — some conforme as fases avançam. */
export function EmConstrucao({ fase, itens }: { fase: string; itens: string[] }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm font-medium">Previsto para a {fase}</p>
        <ul className="mt-3 flex flex-col gap-1.5 text-sm text-muted-foreground">
          {itens.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="text-primary">•</span>
              {item}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
