import PsicoPageSkeleton from "@/components/PsicoPageSkeleton";

export default function Loading() {
  return (
    <PsicoPageSkeleton
      variant="default"
      title="Carregando PsicoConnect"
      subtitle="Preparando a plataforma para você."
      compact
    />
  );
}
