#!/bin/bash
curl -skI -o /dev/null -w "HTTP_STATUS: %{http_code}\nCONTENT_TYPE: %{content_type}\n" "https://speed4you.net/media/TV_Series/TV_Web_Series-0-9_A-E/Crashh/Season 01 (2021) [Hindi]/Crashh 2021 Hindi S01E01.mkv"
