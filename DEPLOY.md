# Публикация на grisk.fun с телефона (Termux + Cloudflare Tunnel)

## Как это работает

У мобильного оператора нет белого IP, порт пробросить некуда. Поэтому
соединение устанавливается **наружу**: телефон сам подключается к Cloudflare и
держит канал, а Cloudflare принимает запросы на `grisk.fun` и отдаёт их в этот
канал.

```
Игрок → https://grisk.fun → Cloudflare → туннель → телефон, Node на :8787
```

Плюсы: TLS-сертификат выдаёт Cloudflare, настраивать нечего; IP телефона нигде
не светится; работает за NAT и из-под любого оператора.

---

## 1. Телефон

Termux ставить **из F-Droid или с GitHub**, версия из Google Play устарела и
многие пакеты в ней не работают.

```bash
pkg update -y && pkg upgrade -y
pkg install -y nodejs git
node -v
```

Нужен **Node 22.18 или новее** — сервер запускается прямо из `.ts` без сборки.

Чтобы Android не усыплял процесс, поставьте Termux:API и снимите ограничение
батареи для Termux в настройках системы:

```bash
pkg install -y termux-api
```

## 2. Проект

```bash
git clone -b arena/01a1069e-crashf https://github.com/pstaverf/crashf.git
cd crashf
npm run serve
```

`npm run serve` сам поставит зависимости, соберёт фронтенд, возьмёт wake-lock и
поднимет сервер на `127.0.0.1:8787`. Проверка в соседней сессии Termux:

```bash
curl localhost:8787/api/health
```

Должно ответить `{"ok":true,...}`.

## 3. Туннель

```bash
pkg install -y tur-repo
pkg install -y cloudflared
cloudflared --version
```

Если пакет не нашёлся, он лежит в дополнительном репозитории `tur-repo` —
команда выше его как раз подключает.

**Туннель создаём в панели, а не командой `cloudflared tunnel login`** — на
Android она не может открыть браузер и завершается ошибкой.

1. https://one.dash.cloudflare.com → **Networks → Tunnels → Create a tunnel**
2. Тип **Cloudflared**, имя любое, например `grisk-phone`
3. На шаге установки скопируйте **токен** — длинную строку после
   `--token` (сам скрипт установки не нужен)
4. Вкладка **Public Hostnames → Add a public hostname**:
   - Domain: `grisk.fun`
   - Subdomain: оставить пустым
   - Type: `HTTP`
   - URL: `localhost:8787`
5. Сохранить

DNS-запись Cloudflare создаст сам — руками в DNS лезть не нужно.

Положите токен на телефон и запустите туннель во **второй сессии Termux**
(первая занята сервером):

```bash
echo 'ВАШ_ТОКЕН' > ~/.cf-tunnel-token
chmod 600 ~/.cf-tunnel-token
cd crashf && npm run tunnel
```

Через несколько секунд в панели Cloudflare туннель станет `HEALTHY`, а
https://grisk.fun откроется.

## 4. Настройки Cloudflare

| Что | Где | Значение |
|---|---|---|
| Режим SSL | SSL/TLS → Overview | **Full** (не Flexible) |
| Кэш API | Rules → Cache Rules | для `/api/*` — **Bypass cache** |
| Rocket Loader | Speed → Optimization | **Off** |

Кэш для `/api/*` обязательно в обход: иначе Cloudflare может закэшировать
состояние раунда, и у игроков застынет множитель.

Отдельно проверьте **CORS на своём CDN**: `cdn.kleymorf.xyz` должен отдавать
`Access-Control-Allow-Origin: https://grisk.fun` (или `*`), иначе анимации не
загрузятся и вместо них отрисуются CSS-заглушки.

## 5. Автозапуск после перезагрузки

Поставьте **Termux:Boot** (F-Droid), запустите приложение один раз, затем:

```bash
mkdir -p ~/.termux/boot
cat > ~/.termux/boot/crash <<'EOF'
#!/data/data/com.termux/files/usr/bin/sh
termux-wake-lock
cd ~/crashf && npm run serve &
cd ~/crashf && npm run tunnel &
EOF
chmod +x ~/.termux/boot/crash
```

## 6. Обновление версии

```bash
cd ~/crashf
git pull
npm run serve
```

Скрипт сам пересоберёт фронтенд, если исходники изменились. Туннель
перезапускать не нужно.

---

## Если что-то не работает

**`grisk.fun` отдаёт 502** — сервер не запущен или слушает не тот порт.
Проверьте `curl localhost:8787/api/health` на телефоне.

**Туннель в панели `DOWN`** — у телефона пропала сеть или Android усыпил
Termux. Нужен wake-lock и отключённая оптимизация батареи для Termux.

**cloudflared ругается на DNS** — у Termux нет `/etc/resolv.conf`. Запустите
туннель через `termux-chroot`:

```bash
pkg install -y proot
termux-chroot npm run tunnel
```

**Множитель дёргается или обновляется рывками** — Cloudflare буферизует поток
событий. Убедитесь, что для `/api/*` стоит Bypass cache и выключен Rocket
Loader.

**Телефон греется и садится батарея** — это нормально для постоянно
работающего сервера. Держите на зарядке; желательно ограничить зарядку до 80%,
если телефон это умеет.

---

## Честное предупреждение

Телефон в Termux — нормальный вариант, чтобы показать проект и потестировать с
друзьями. Для реальной нагрузки он не годится: Android убивает фоновые
процессы, при перезагрузке всё поднимается только через Termux:Boot, а баланс
игроков сейчас всё равно живёт в браузере и обнуляется при перезагрузке
страницы. Как только дойдёт до настоящих ставок, нужен обычный VPS за пару
долларов в месяц — те же команды, но с systemd вместо Termux:Boot.
