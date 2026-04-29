# Instrucciones para Corregir Vulnerabilidades de Seguridad en Supabase

## Problema
Supabase detectó dos vulnerabilidades críticas:
1. **Tablas públicamente accesibles** - Sin RLS habilitado
2. **Datos sensibles expuestos** - Columnas sensibles accesibles sin restricciones

## Solución

### Paso 1: Acceder a la Consola SQL de Supabase

1. Ve a [https://app.supabase.com](https://app.supabase.com)
2. Selecciona tu proyecto `consultario-dental` (ID: `btneovpiaxdvjruskbth`)
3. En el menú lateral, ve a **"SQL Editor"**
4. Crea una **"New query"**

### Paso 2: Ejecutar el Script de Seguridad

1. Abre el archivo `supabase_security_fix.sql` de este proyecto
2. Copia todo el contenido
3. Pégalo en el SQL Editor de Supabase
4. Ejecuta el script haciendo clic en **"Run"**

### Paso 3: Verificar que Funciona

Después de ejecutar el script, corre estas consultas de verificación en el SQL Editor:

```sql
-- Verificar que RLS está habilitado en todas las tablas
SELECT 
    tablename,
    rowsecurity,
    forcerowsecurity
FROM pg_tables
WHERE tablename IN ('patients', 'appointments', 'payments', 'inventory')
AND schemaname = 'public';
```

Deberías ver:
```
| tablename    | rowsecurity | forcerowsecurity |
|--------------|-------------|------------------|
| patients     | true        | true             |
| appointments | true        | true             |
| payments     | true        | true             |
| inventory    | true        | true             |
```

```sql
-- Verificar políticas creadas
SELECT 
    tablename,
    policyname,
    roles
FROM pg_policies
WHERE tablename IN ('patients', 'appointments', 'payments', 'inventory')
AND schemaname = 'public';
```

Deberías ver políticas como:
- `"Enable all operations for authenticated users only"`
- `"Block anonymous access"`

### Paso 4: Probar la Aplicación

1. Abre tu aplicación en el navegador
2. Inicia sesión con tu usuario
3. Verifica que puedes:
   - Ver la lista de pacientes
   - Crear/editar turnos
   - Ver pagos
   - Gestionar inventario

Si algo no funciona, revisa la consola del navegador (F12) por errores de permisos.

## Qué Hace Este Fix

### Tablas Protegidas
- `patients` - Datos personales de pacientes
- `appointments` - Turnos médicos
- `payments` - Información financiera
- `inventory` - Inventario de insumos

### Políticas Aplicadas

**Para usuarios autenticados (`authenticated`):**
- Pueden leer, insertar, actualizar y eliminar registros
- Tienen acceso total pero SOLO si iniciaron sesión

**Para usuarios anónimos (`anon`):**
- NO pueden hacer NADA
- Todas las operaciones están bloqueadas

### Storage Protegido
- El bucket `patient-files` (imágenes y documentos médicos) también está protegido
- Solo usuarios autenticados pueden subir/descargar archivos

## Notas Importantes

⚠️ **Después de aplicar este fix:**
- Cualquier persona sin login NO podrá ver ni modificar datos
- Solo usuarios con cuenta válida podrán usar la aplicación
- Los datos están protegidos a nivel de base de datos

✅ **Tu aplicación debería seguir funcionando** porque:
- Usa login con Supabase Auth
- Todas las llamadas a la API incluyen el token de autenticación
- El cliente Supabase en el navegador maneja la sesión automáticamente

## Si Algo Sale Mal

Si la aplicación deja de funcionar después de aplicar RLS:

1. Revisa que estés logueado en la aplicación
2. Cierra sesión y vuelve a iniciar
3. Si persiste el problema, verifica en la consola del navegador si hay errores 403/401

Para **deshabilitar RLS temporalmente** (solo en caso de emergencia):
```sql
ALTER TABLE public.patients DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory DISABLE ROW LEVEL SECURITY;
```
