# MiráList

MiráList es una aplicación web para organizar los animes, series y películas que ves. Permite explorar catálogos, consultar información de cada obra y llevar un seguimiento personal con capítulos vistos, puntuaciones, fechas y notas.

## Enfoque del proyecto

La aplicación cuenta con una interfaz responsive desarrollada con React, Bootstrap y CSS propio, con temas claro y oscuro.

Los datos del catálogo se obtienen desde MyAnimeList y TMDB. AnimeSchedule aporta fechas de emisión de anime cuando están disponibles. El catálogo se puede explorar sin cuenta; para guardar obras y carpetas es necesario iniciar sesión.

El backend está desarrollado en C# con ASP.NET Core, organizado en API, Application, Domain e Infrastructure. Las cuentas y bibliotecas se guardan en SQL Server.

## Funcionalidades

- Búsqueda de anime, OVAs, ONAs, series y películas, con filtros y orden por estreno.
- Fichas con información, obras relacionadas y recomendaciones.
- Bibliotecas separadas para anime y para series y películas.
- Seguimiento de capítulos, estados, estrellas, fechas y notas personales.
- Favoritos, carpetas y acciones sobre varias obras.
- Estadísticas, selección aleatoria de pendientes y calendario de estrenos.
- Registro, verificación de correo y recuperación de contraseña.
- Exportación e importación de la biblioteca.
- Diseño responsive, modo claro y oscuro, y manejo de cargas y errores.

## Tecnologías utilizadas

- React, JavaScript y Vite.
- HTML, CSS y Bootstrap.
- C#, ASP.NET Core y Entity Framework Core.
- SQL Server.
- APIs de MyAnimeList, TMDB y AnimeSchedule.
- Brevo para el envío de correos.

## Instalación y ejecución local

Requiere **Node.js 22.12 o superior**, **.NET 10** y **SQL Server**.

```powershell
git clone https://github.com/ccabeda/MIRALIST.git
cd MIRALIST
npm.cmd install
Copy-Item .env.example .env.local
```

Completá `MAL_CLIENT_ID`, `TMDB_READ_TOKEN` y `ANIMESCHEDULE_TOKEN` en `.env.local`.

En desarrollo, la conexión predeterminada usa `.\SQLEXPRESS`, la base `Miralist` y autenticación de Windows. Para otra instancia, configurá `ConnectionStrings__Miralist` como variable de entorno antes de inicializar y ejecutar el backend.

```powershell
npm.cmd run backend:init
npm.cmd run backend
```

`backend:init` crea o actualiza la estructura de la base configurada mediante migraciones. Los comandos usan el SDK de `.tools/dotnet` si está disponible; de lo contrario, el instalado en el equipo.

En otra terminal, desde la carpeta del proyecto:

```powershell
npm.cmd run dev
```

Frontend: `http://127.0.0.1:5173`. Backend: `http://127.0.0.1:5080`.

Para habilitar correos, configurá `Email__Enabled`, `Email__ApiKey`, `Email__SenderAddress` y `Email__PublicAppUrl` como variables de entorno del backend. En desarrollo también se admite `backend/API/App_Data/email.json`. Las credenciales y `App_Data` están excluidos de Git.

El acceso a los catálogos utiliza el servidor de Vite en `dev` o `preview`; publicar únicamente los archivos de `dist` no incluye ese servidor.

### Comprobaciones

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run format:check
npm.cmd run build
npm.cmd run backend:test
```

Las pruebas del backend crean y eliminan bases temporales `MiralistAuthTests_*`. Su conexión se puede cambiar con `MIRALIST_TEST_SQLSERVER`.

### Copias de seguridad

La exportación JSON desde la web incluye la biblioteca, no las cuentas. `scripts/backup-sql.ps1` respalda la base SQL y conserva siete días de copias; `scripts/install-backup-task.ps1` permite programarlas diariamente.

## Autor

- Agustín Cabeda — [ccabeda](https://github.com/ccabeda).
