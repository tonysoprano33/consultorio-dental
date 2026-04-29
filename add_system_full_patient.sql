-- Agregar paciente de sistema para "Agenda Completa"
-- Este paciente se usa para marcar días como FULL en el calendario

INSERT INTO public.patients (id, name, phone)
VALUES (
  'c4725e3c-ab91-4d49-91c3-2569d89f5384',
  '[SISTEMA] Agenda Completa',
  ''
)
ON CONFLICT (id) DO NOTHING;

-- Verificar que el paciente fue creado
SELECT id, name, phone FROM public.patients WHERE id = 'c4725e3c-ab91-4d49-91c3-2569d89f5384';
