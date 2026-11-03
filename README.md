# Учёт компьютерной техники — Ганцевичская центральная районная библиотека

Веб-приложение для инвентарного учёта компьютеров и периферии организации.
Интерфейс полностью на русском языке, данные хранятся в локальной базе SQLite.

**Текущая версия: 1.0.0**

Документация проекта:

- [История изменений](CHANGELOG.md)
- [Правила версионирования](docs/VERSIONING.md)
- [Публикация проекта на GitHub](docs/GITHUB.md)
- [Заметки к релизу 1.0.0](docs/RELEASE_NOTES_v1.0.0.md)

## Возможности

- учёт компьютеров: инвентарный номер, модель, процессор, видеокарта, объём ОЗУ,
  накопитель, материнская плата, операционная система, кабинет, ответственный,
  дата ввода в эксплуатацию и примечания;
- учёт периферии: мыши, клавиатуры, мониторы, принтеры, сканеры, ИБП и другие
  устройства с собственным инвентарным номером;
- привязка устройств к компьютерам и работа с периферией без привязки;
- поиск по всем основным полям, фильтры по типу устройства и компьютеру;
- сводка: количество компьютеров, периферии, мониторов и устройств без привязки;
- добавление, редактирование и удаление записей через удобные формы;
- проверка уникальности инвентарных номеров (без учёта регистра) между
  компьютерами и устройствами;
- при удалении компьютера его периферия не пропадает, а остаётся в системе
  без привязки;
- адаптивный интерфейс для компьютеров, планшетов и телефонов.

## Стек

| Часть      | Технологии                                                        |
| ---------- | ----------------------------------------------------------------- |
| Backend    | C# / .NET 8, ASP.NET Core Web API, Entity Framework Core 8, SQLite |
| Frontend   | React 18, Vite 5, JavaScript (JSX), HTML5, CSS3                   |
| Документация API | Swagger / OpenAPI (в режиме Development)                    |

## Структура проекта

```
GantsevichiLibrary/
├─ server/                     # ASP.NET Core Web API
│  ├─ Controllers/             # ComputersController, DevicesController
│  ├─ Data/AppDbContext.cs     # контекст EF Core и настройка модели
│  ├─ Dtos/                    # входные и выходные модели API
│  ├─ Models/                  # Computer, Device, DeviceType
│  ├─ wwwroot/                 # собранный React-интерфейс (создаётся при сборке)
│  ├─ Program.cs
│  └─ LibraryInventory.Api.csproj
├─ client/                     # React + Vite
│  ├─ src/
│  │  ├─ components/           # карточки, таблица, формы, модальные окна
│  │  ├─ App.jsx
│  │  └─ styles.css
│  └─ vite.config.js
└─ README.md
```

## Требования

- [.NET SDK 8.0](https://dotnet.microsoft.com/download/dotnet/8.0) или новее;
- [Node.js](https://nodejs.org/) 18+ и npm.

Проверить установку:

```powershell
dotnet --version
node --version
npm --version
```

## Быстрый запуск (одним сервером)

Самый простой способ — запустить `start.cmd` в папке проекта (двойным щелчком
или командой):

```powershell
.\start.cmd
```

Скрипт при необходимости установит npm-зависимости, соберёт интерфейс и запустит
сервер. Откройте <http://localhost:5169>.

Те же действия вручную:

```powershell
cd client
npm install
npm run build
cd ..\server
dotnet run
```

`npm run build` собирает React-приложение сразу в `server/wwwroot`, после чего
ASP.NET Core раздаёт и API, и интерфейс с одного адреса.

> На этом компьютере .NET 8 SDK установлен в `%USERPROFILE%\.dotnet`, поэтому
> `start.cmd` использует его автоматически. Если обычная команда `dotnet run`
> запускает старый SDK, запускайте сервер через `start.cmd` или явно:
> `& "$env:USERPROFILE\.dotnet\dotnet.exe" run`.
>
> Если PowerShell запрещает запуск `npm.ps1`, используйте `npm.cmd install` и
> `npm.cmd run build` — `start.cmd` делает это автоматически.

## Режим разработки

Терминал 1 — API:

```powershell
cd server
dotnet run
```

Терминал 2 — клиент с горячей перезагрузкой:

```powershell
cd client
npm install
npm run dev
```

Откройте <http://localhost:5173>. Запросы `/api/*` проксируются на
`http://localhost:5169` (настроено в `client/vite.config.js`).

Swagger доступен в режиме разработки: <http://localhost:5169/swagger>.

## База данных

- Файл базы: `server/library.db` (SQLite).
- При первом запуске база и таблицы создаются автоматически.
- Для резервной копии достаточно скопировать файл `library.db` (при остановленном
  сервере).
- Чтобы начать учёт с нуля, остановите сервер и удалите `library.db`,
  `library.db-shm` и `library.db-wal` — при следующем запуске база создастся заново.
- Строка подключения находится в `server/appsettings.json`.

Таблицы:

- `Computers` — компьютеры и их комплектующие;
- `Devices` — периферия; поле `ComputerId` может быть пустым (устройство без привязки).

При удалении компьютера у связанных устройств `ComputerId` автоматически
становится пустым (`ON DELETE SET NULL`).

## API

Базовый адрес: `http://localhost:5169/api`.

| Метод  | Маршрут                | Назначение                                      |
| ------ | ---------------------- | ----------------------------------------------- |
| GET    | `/computers`           | список компьютеров, параметр `?search=`         |
| GET    | `/computers/{id}`      | компьютер по id                                 |
| POST   | `/computers`           | добавить компьютер                              |
| PUT    | `/computers/{id}`      | изменить компьютер                              |
| DELETE | `/computers/{id}`      | удалить компьютер                               |
| GET    | `/devices`             | список устройств, параметры `search`, `type`, `computerId`, `unassigned` |
| GET    | `/devices/{id}`        | устройство по id                                |
| POST   | `/devices`             | добавить устройство                             |
| PUT    | `/devices/{id}`        | изменить устройство                             |
| DELETE | `/devices/{id}`        | удалить устройство                              |

Пример добавления компьютера:

```json
{
  "inventoryNumber": "ПК-0001",
  "model": "Lenovo ThinkCentre M70q",
  "processor": "Intel Core i5-12400",
  "graphicsCard": "Intel UHD Graphics 730",
  "ramGb": 16,
  "storage": "SSD 512 ГБ",
  "motherboard": "Lenovo 12T3",
  "operatingSystem": "Windows 11 Pro",
  "location": "Читальный зал",
  "assignedTo": "Иванова А. П.",
  "commissionedOn": "2024-09-02",
  "notes": "Основное рабочее место"
}
```

Пример добавления монитора с привязкой к компьютеру `id = 1`:

```json
{
  "inventoryNumber": "МОН-0012",
  "type": "Monitor",
  "manufacturer": "Dell",
  "model": "P2219H",
  "serialNumber": "CN-012345",
  "computerId": 1
}
```

Допустимые значения `type`: `Mouse`, `Keyboard`, `Monitor`, `Printer`, `Scanner`,
`Ups`, `Other`.

Готовые примеры запросов также находятся в `server/LibraryInventory.Api.http`.

## Версии и GitHub

Проект ведётся по принципам семантического версионирования: `MAJOR.MINOR.PATCH`.
Каждое изменение фиксируется в [CHANGELOG.md](CHANGELOG.md), а готовые версии
оформляются релизами с тегами `v1.0.0`, `v1.1.0` и т. д.

- как публиковать проект на GitHub — [docs/GITHUB.md](docs/GITHUB.md);
- когда повышать версию и как оформлять коммиты — [docs/VERSIONING.md](docs/VERSIONING.md);
- готовый текст для первого релиза — [docs/RELEASE_NOTES_v1.0.0.md](docs/RELEASE_NOTES_v1.0.0.md).

Для автоматической проверки сборки добавлен GitHub Actions workflow
`.github/workflows/ci.yml`: он собирает backend на .NET 8 и frontend на Node.js
при каждом push в `main` и при создании Pull Request.

Не публикуйте в репозиторий файл базы `server/library.db` и папку
`client/node_modules` — они исключены через `.gitignore`.

## Примечания

- Приложение не содержит авторизации и рассчитано на работу в локальной сети
  организации. При публикации в интернете обязательно добавьте аутентификацию
  и ограничение доступа.
- CORS в `Program.cs` разрешает локальные адреса разработки
  (`localhost:5173` и `localhost:4173`). При раздаче интерфейса с того же сервера
  CORS не требуется.
- Для изменения схемы базы в дальнейшем рекомендуется перейти с
  `Database.EnsureCreated()` на EF Core Migrations.
- Проверены сценарии: добавление и редактирование компьютера, добавление
  периферии с привязкой, поиск и фильтры, удаление компьютера с сохранением
  периферии без привязки, удаление устройства.
