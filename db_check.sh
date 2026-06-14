#!/bin/bash
psql -d speed4you -c "SELECT episode_number, title, source_path FROM episodes WHERE series_id = '\''how-i-met-your-mother-2005'\'' AND season_number = 1 ORDER BY episode_number;"
