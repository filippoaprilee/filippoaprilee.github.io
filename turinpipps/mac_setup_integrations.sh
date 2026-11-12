#!/bin/bash
# Configurazione interattiva sul Mac: nessuna password finisce nel repository.
set -euo pipefail
umask 077
DIR="$HOME/Library/Application Support/CasaRadar"
FILE="$DIR/config.env"
mkdir -p "$DIR"
echo "CasaRadar - integrazioni facoltative"
echo "Gli avvisi devono essere prima attivati sui portali immobiliari."
read -r -p "Connettere casella email IMAP per avvisi? [s/N] " ANSWER
if [[ "$ANSWER" =~ ^[sSyY]$ ]]; then
  read -r -p "Host IMAP [imap.gmail.com]: " HOST
  HOST="${HOST:-imap.gmail.com}"
  read -r -p "Porta IMAP [993]: " PORT
  PORT="${PORT:-993}"
  read -r -p "Indirizzo email: " USER
  if [ -z "$USER" ]; then echo "Indirizzo email mancante"; exit 1; fi
  read -r -s -p "Password per app IMAP (digitazione nascosta): " SECRET
  echo
  /usr/bin/security add-generic-password -U -a "$USER" -s "casaradar-imap" -w "$SECRET"
  unset SECRET
  printf -v QHOST '%q' "$HOST"
  printf -v QPORT '%q' "$PORT"
  printf -v QUSER '%q' "$USER"
  { printf "CASARADAR_IMAP_HOST=%s\n" "$QHOST";
    printf "CASARADAR_IMAP_PORT=%s\n" "$QPORT";
    printf "CASARADAR_IMAP_USER=%s\n" "$QUSER"; } > "$FILE"
  chmod 600 "$FILE"
  echo "Credenziali email salvate nel Portachiavi macOS; configurazione senza password in $FILE"
fi
read -r -p "Attivare notifiche Telegram (bot già creato)? [s/N] " ANSWER
if [[ "$ANSWER" =~ ^[sSyY]$ ]]; then
  read -r -p "Chat ID Telegram: " CHAT
  if ! [[ "$CHAT" =~ ^-?[0-9]+$ ]]; then echo "Chat ID non valido";exit 1; fi
  read -r -s -p "Bot token Telegram (digitazione nascosta): " TOKEN
  echo
  /usr/bin/security add-generic-password -U -a "$CHAT" -s "casaradar-telegram" -w "$TOKEN"
  unset TOKEN
  printf -v QCHAT '%q' "$CHAT"
  printf "CASARADAR_TELEGRAM_CHAT_ID=%s\n" "$QCHAT" >> "$FILE"
  chmod 600 "$FILE"
  echo "Token Telegram salvato nel Portachiavi macOS."
fi
echo "Configurazione completata. Non caricare mai config.env su GitHub."
