# Domi's prac script
This script is made to make some useful practice things easier mainly by creating some chat !commands with cs_script.

## Features
- Show how much damage was dealt when shooting someone in console.  

Commands:
```
!help - Shows help for commands. Usage: !help <commandName?>
!give - Gives player specified target. Usage: !give <item/knife/preset> <itemType (give equivalent/!knives/!presets)>
!knives - Shows a list of knives to !give knife
!presets - Shows a list of presets to !give preset
!clear - Clears specified target. Usage: !clear <smoke/fire/decoys/weapons>
!check - Places a checkpoint in player's current position.
!tele - Teleports player to their last checkpoint position.
!tpto - Teleports player to a specified player. Usage: !tpto <playerName>
!place - Places specified player/self according to player's cursor. Usage: !place <playerName?>
!kill - Kills specified player/self. Usage: !kill <playerName?>
!spec - Puts player/self to spectators. Usage: !spec <playerName?>
!t - Puts player/self to terrorist. Usage: !t <playerName?>
!ct - Puts player/self to counter-terrorists. !ct <playerName?>
```

## How to use 
- Clone the repository: `git clone https://github.com/dom1torii/cs2prac.git`
- (optional because included) Compile the script with `python vjs_compiler.py domiprac.js`
- Place compiled script anywhere in your `game/csgo` folder (`game/csgo/scripts/domiprac.vjs_c` in my case)
- Run practice
- Create `point_script` entity using `ent_create point_script {"cs_script" "path/to/script.vjs"}` (`game/csgo` is considered root, so no need to enter it) (no _c is important)
- Done
