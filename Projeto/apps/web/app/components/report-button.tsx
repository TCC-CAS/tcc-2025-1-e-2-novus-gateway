import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Flag, X } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  Form,
  FormField,
  FormItem,
  FormMessage,
} from "~/components/ui/form";
import { reportApi } from "~/lib/api-client";
import { CreateReportRequestSchema, ReportReasonSchema } from "~shared/contracts/moderation";

const REASON_LABELS: Record<string, string> = {
  inappropriate: "CONTEÚDO INAPROPRIADO",
  spam: "SPAM",
  fake: "PERFIL FALSO",
  harassment: "ASSÉDIO",
  other: "OUTRO",
};

const formSchema = CreateReportRequestSchema.omit({ reportedEntityType: true, reportedEntityId: true });

export function ReportButton({
  entityType,
  entityId,
}: {
  entityType: "player" | "team" | "message";
  entityId: string;
}) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { reason: "inappropriate", description: "" },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      await reportApi.create({
        reportedEntityType: entityType,
        reportedEntityId: entityId,
        ...values,
      });
      toast.success("Denúncia enviada.");
      form.reset();
      setOpen(false);
    } catch {
      toast.error("Erro ao enviar denúncia.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const entityLabel = entityType === "player" ? "JOGADOR" : entityType === "team" ? "TIME" : "MENSAGEM";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 rounded-none border-2 border-foreground/20 font-bold uppercase tracking-widest text-muted-foreground hover:border-destructive hover:text-destructive hover:bg-transparent"
        >
          <Flag className="size-3.5" />
          Denunciar
        </Button>
      </DialogTrigger>

      <DialogContent className="rounded-none border-4 border-foreground p-0 shadow-[8px_8px_0px_0px_var(--color-foreground)] sm:max-w-lg [&>button]:hidden">
        {/* Header */}
        <div className="border-b-4 border-foreground bg-foreground px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Flag className="size-5 text-background" />
            <h2 className="font-display text-2xl tracking-widest text-background uppercase">
              DENUNCIAR {entityLabel}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-background/60 hover:text-background transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-6">
            {/* Reason */}
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <p className="font-bold text-xs uppercase tracking-widest text-muted-foreground">
                    MOTIVO
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {ReportReasonSchema.options.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => field.onChange(option)}
                        className={`w-full px-4 py-3 text-left border-2 font-bold text-sm uppercase tracking-widest transition-all ${
                          field.value === option
                            ? "border-foreground bg-foreground text-background"
                            : "border-foreground/20 text-foreground hover:border-foreground hover:bg-foreground/5"
                        }`}
                      >
                        {REASON_LABELS[option] ?? option.toUpperCase()}
                      </button>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <p className="font-bold text-xs uppercase tracking-widest text-muted-foreground">
                    DESCRIÇÃO <span className="text-muted-foreground/40">(OPCIONAL)</span>
                  </p>
                  <textarea
                    {...field}
                    rows={3}
                    placeholder="Descreva o problema..."
                    className="w-full resize-none border-2 border-foreground/20 bg-transparent px-4 py-3 text-sm font-medium text-foreground placeholder:text-muted-foreground/40 outline-none transition-colors focus:border-foreground"
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 rounded-none border-2 border-foreground/20 font-bold uppercase tracking-widest hover:border-foreground hover:bg-foreground hover:text-background"
                onClick={() => setOpen(false)}
              >
                CANCELAR
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 rounded-none border-2 border-destructive bg-destructive font-bold uppercase tracking-widest text-destructive-foreground hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_var(--color-foreground)] transition-all"
              >
                <Flag className="size-4 mr-2" />
                {isSubmitting ? "ENVIANDO..." : "DENUNCIAR"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
