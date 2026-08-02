import { Instance } from "cs_script/point_script";

const prefix = "[Prac]";

// Instance.Msg() only sends the message to the host,
// so we use echo on specified player's client instead
function echoMessageToPlayer(playerController, message) {
  const playerSlot = playerController.GetPlayerSlot();
  Instance.ClientCommand(playerSlot, `echo ${prefix} ${message}`);
}

function findPlayerController(name) {
  const playerControllers = Instance.GetAllPlayerControllers();
  const playerController = playerControllers.find(
    (p) => p.GetPlayerName() === name,
  );
  return playerController;
}

function killPlayer(caller, name) {
  const playerController = findPlayerController(name);
  if (!playerController) {
    echoMessageToPlayer(caller, `Player ${name} not found`);
    return;
  }

  const pawn = playerController.GetPlayerPawn();
  pawn.Kill();
  echoMessageToPlayer(caller, `Killed ${name}.`);
}

function movePlayerToTeam(caller, name, teamNum) {
  const playerController = findPlayerController(name);
  if (!playerController) {
    echoMessageToPlayer(caller, `Player ${name} not found`);
    return;
  }

  playerController.JoinTeam(teamNum);
  echoMessageToPlayer(caller, `Moved ${name} to team ${teamNum}`);
}

function goto(caller, name) {
  const callerPawn = caller.GetPlayerPawn();
  const playerController = findPlayerController(name);
  if (!playerController) {
    echoMessageToPlayer(caller, `Player ${name} not found`);
    return;
  }

  const playerPawn = playerController.GetPlayerPawn();
  const absOrigin = playerPawn.GetAbsOrigin();
  const absAngles = playerPawn.GetAbsAngles();
  const absVelocity = callerPawn.GetAbsVelocity();
  const absAngularVelocity = callerPawn.GetAbsAngularVelocity();

  callerPawn.Teleport({
    position: absOrigin,
    angles: absAngles,
    velocity: absVelocity,
    angularVelocity: absAngularVelocity,
  });

  const callerName = caller.GetPlayerName();
  echoMessageToPlayer(caller, `Teleported ${callerName} to ${name}`);
}

const checkpointPositions = new Map();

function checkpoint(caller) {
  const callerPawn = caller.GetPlayerPawn();
  const absOrigin = callerPawn.GetAbsOrigin();
  const eyeAngles = callerPawn.GetEyeAngles();

  checkpointPositions.set(caller.GetPlayerSlot(), {
    position: absOrigin,
    angles: eyeAngles,
  });

  echoMessageToPlayer(
    caller,
    `Set a checkpoint at ${JSON.stringify(absOrigin)} with angles ${JSON.stringify(eyeAngles)}`,
  );
}

function teleport(caller) {
  const checkpointPosition = checkpointPositions.get(caller.GetPlayerSlot());
  if (!checkpointPosition) {
    echoMessageToPlayer(caller, `No checkpoint set yet`);
    return;
  }

  const callerPawn = caller.GetPlayerPawn();
  const { position, angles } = checkpointPosition;

  // proper pitch will only be set for the host since setang command is "missing required FCVAR flag"
  // making it impossible to setang with ClientCommand()

  // assume host is always slot 0 (test if its actually true)
  const isHost = caller.GetPlayerSlot() === 0;

  callerPawn.Teleport({
    position,
    velocity: { x: 0, y: 0, z: 0 },
    angularVelocity: { x: 0, y: 0, z: 0 },
    ...(!isHost && {
      angles: { ...angles, pitch: 0 },
    }),
  });

  if (isHost) {
    Instance.ServerCommand(
      `setang ${angles.pitch} ${angles.yaw} ${angles.roll}`,
    );
    echoMessageToPlayer(
      caller,
      `Teleported to a checkpoint at ${JSON.stringify(position)} with angles ${JSON.stringify(angles)}`,
    );
  } else {
    echoMessageToPlayer(
      caller,
      `Teleported to a checkpoint at ${JSON.stringify(position)} with angles ${JSON.stringify({ ...angles, pitch: 0 })}`,
    );
  }
}

function angleToForward(angles) {
  const pitch = (angles.pitch * Math.PI) / 180;
  const yaw = (angles.yaw * Math.PI) / 180;

  return {
    x: Math.cos(pitch) * Math.cos(yaw),
    y: Math.cos(pitch) * Math.sin(yaw),
    z: -Math.sin(pitch),
  };
}

function getTracedPosition(pawn) {
  const eyePos = pawn.GetEyePosition();
  const eyeAngles = pawn.GetEyeAngles();

  const forward = angleToForward(eyeAngles);

  const trace = Instance.TraceLine({
    start: eyePos,
    end: {
      x: eyePos.x + forward.x * 8192,
      y: eyePos.y + forward.y * 8192,
      z: eyePos.z + forward.z * 8192,
    },
    ignoreEntity: pawn,
    ignorePlayers: true,
  });

  if (!trace.didHit) {
    return null;
  }

  let position = {
    x: trace.end.x,
    y: trace.end.y,
    z: trace.end.z,
  };

  // offset from walls and ceiling to prevent getting stuck
  if (Math.abs(trace.normal.z) < 0.5) {
    // 17 because 32/2+1 (32 is player bounding box width)
    position.x += trace.normal.x * 17;
    position.y += trace.normal.y * 17;
  } else if (trace.normal.z < 0) {
    // 73 because 72+1 (72 is player bounding box height)
    position.z += trace.normal.z * 73;
  }

  return position;
}

function placePlayer(caller, name) {
  const callerPawn = caller.GetPlayerPawn();
  const playerController = findPlayerController(name);
  if (!playerController) {
    echoMessageToPlayer(caller, `Player ${name} not found`);
    return;
  }
  const playerPawn = playerController.GetPlayerPawn();

  const position = getTracedPosition(callerPawn);

  if (!position) {
    return;
  }

  playerPawn.Teleport({
    position,
    angles: playerPawn.GetAbsAngles(),
    velocity: {
      x: 0,
      y: 0,
      z: 0,
    },
    angularVelocity: {
      x: 0,
      y: 0,
      z: 0,
    },
  });

  echoMessageToPlayer(
    caller,
    `Placed ${name} to position ${JSON.stringify(position)} with angles ${JSON.stringify(angles)}`,
  );
}

const GIVE_PRESETS = {
  t: [
    {
      name: "default",
      items: [
        "weapon_ak47",
        "weapon_glock",
        "weapon_hegrenade",
        "weapon_flashbang",
        "weapon_flashbang",
        "weapon_smokegrenade",
        "weapon_molotov",
      ],
      armor: true,
      helmet: true,
    },
    {
      name: "awp",
      items: [
        "weapon_awp",
        "weapon_cz75a",
        "weapon_hegrenade",
        "weapon_flashbang",
        "weapon_flashbang",
        "weapon_smokegrenade",
        "weapon_molotov",
      ],
      armor: true,
      helmet: true,
    },
    {
      name: "deagle",
      items: ["weapon_deagle", "weapon_flashbang"],
      armor: true,
      helmet: false,
    },
  ],
  ct: [
    {
      name: "default",
      items: [
        "weapon_m4a1",
        "weapon_usp_silencer",
        "weapon_hegrenade",
        "weapon_flashbang",
        "weapon_flashbang",
        "weapon_smokegrenade",
        "weapon_incgrenade",
      ],
      armor: true,
      helmet: true,
    },
    {
      name: "default2",
      items: [
        "weapon_m4a1_silencer",
        "weapon_usp_silencer",
        "weapon_hegrenade",
        "weapon_flashbang",
        "weapon_flashbang",
        "weapon_smokegrenade",
        "weapon_incgrenade",
      ],
      armor: true,
      helmet: true,
    },
    {
      name: "default3",
      items: [
        "weapon_m4a1",
        "weapon_hkp2000",
        "weapon_hegrenade",
        "weapon_flashbang",
        "weapon_flashbang",
        "weapon_smokegrenade",
        "weapon_incgrenade",
      ],
      armor: true,
      helmet: true,
    },
    {
      name: "default4",
      items: [
        "weapon_m4a1_silencer",
        "weapon_hkp2000",
        "weapon_hegrenade",
        "weapon_flashbang",
        "weapon_flashbang",
        "weapon_smokegrenade",
        "weapon_incgrenade",
      ],
      armor: true,
      helmet: true,
    },
    {
      name: "awp",
      items: [
        "weapon_awp",
        "weapon_cz75a",
        "weapon_hegrenade",
        "weapon_flashbang",
        "weapon_flashbang",
        "weapon_smokegrenade",
        "weapon_incgrenade",
      ],
      armor: true,
      helmet: true,
    },
    {
      name: "deagle",
      items: ["weapon_deagle", "weapon_flashbang"],
      armor: true,
      helmet: false,
    },
  ],
};

function printLines(caller, str) {
  const lines = str.split("\n");
  for (const i in lines) {
    echoMessageToPlayer(caller, lines[i]);
  }
}

function listPresets(caller) {
  const presetsString = JSON.stringify(GIVE_PRESETS, null, 2);
  printLines(caller, presetsString);
}

function listKnives(caller) {
  const knivesString = JSON.stringify(KNIFE_CLASSES, null, 2);
  printLines(caller, knivesString);
}

function getTeamString(teamNum) {
  if (teamNum === 1) return "spec";
  if (teamNum === 2) return "t";
  if (teamNum === 3) return "ct";
}

function givePreset(caller, presetName) {
  const callerPawn = caller.GetPlayerPawn();
  const callerTeam = getTeamString(callerPawn.GetTeamNumber());
  const teamPresets = GIVE_PRESETS[callerTeam];
  if (!teamPresets) {
    echoMessageToPlayer(
      caller,
      `No presets available for your current team (${callerTeam})`,
    );
    return;
  }
  const preset = teamPresets.find((p) => p.name === presetName);

  if (!preset) {
    echoMessageToPlayer(
      caller,
      `No presets found with name ${presetName}. !presets to see all presets`,
    );
    return;
  }

  callerPawn.DestroyWeapons();

  callerPawn.SetArmor(preset.armor === true ? 100 : 0);
  callerPawn.SetHasHelmet(preset.helmet);

  preset.items.forEach((item) => {
    callerPawn.GiveNamedItem(item);
  });

  echoMessageToPlayer(caller, `Gave preset ${presetName}`);
}

const WEAPON_CLASSES = [
  "weapon_ak47",
  "weapon_aug",
  "weapon_awp",
  "weapon_bizon",
  "weapon_c4",
  "weapon_cz75a",
  "weapon_deagle",
  "weapon_decoy",
  "weapon_elite",
  "weapon_famas",
  "weapon_fiveseven",
  "weapon_flashbang",
  "weapon_g3sg1",
  "weapon_galilar",
  "weapon_glock",
  "weapon_healthshot",
  "weapon_hegrenade",
  "weapon_hkp2000",
  "weapon_incgrenade",
  "weapon_knife",
  "weapon_m249",
  "weapon_m4a1",
  "weapon_m4a1_silencer",
  "weapon_mac10",
  "weapon_mag7",
  "weapon_molotov",
  "weapon_mp5sd",
  "weapon_mp7",
  "weapon_mp9",
  "weapon_negev",
  "weapon_nova",
  "weapon_p250",
  "weapon_p90",
  "weapon_revolver",
  "weapon_sawedoff",
  "weapon_scar20",
  "weapon_sg556",
  "weapon_smokegrenade",
  "weapon_ssg08",
  "weapon_taser",
  "weapon_tec9",
  "weapon_ump45",
  "weapon_usp_silencer",
  "weapon_xm1014",
];

function removeDroppedWeapons() {
  WEAPON_CLASSES.forEach((w) => {
    const weaponEnts = Instance.FindEntitiesByClass(w);
    weaponEnts.forEach((ent) => {
      if (!ent.GetParent()) {
        ent.Remove();
      }
    });
  });
}

// think queue from zoo thingy fixed to work as an actual queue
const thinkQueue = [];

function QueueThink(time, callback) {
  const empty = thinkQueue.length === 0;
  const indexAfter = thinkQueue.findIndex((t) => t.time > time);
  if (indexAfter === -1) thinkQueue.push({ time, callback });
  else thinkQueue.splice(indexAfter, 0, { time, callback });
  if (indexAfter === 0 || empty) Instance.SetNextThink(time);
}

function RunThinkQueue() {
  const upperThinkTime = Instance.GetGameTime() + 1 / 128;
  while (thinkQueue.length > 0 && thinkQueue[0].time <= upperThinkTime) {
    thinkQueue.shift().callback();
  }
  if (thinkQueue.length > 0) Instance.SetNextThink(thinkQueue[0].time);
}

function Delay(delay) {
  return new Promise((resolve) =>
    QueueThink(Instance.GetGameTime() + delay, resolve),
  );
}

Instance.SetThink(() => {
  RunThinkQueue();
});

const KNIFE_CLASSES = {
  kukri: 526,
  butterfly: 515,
  karambit: 507,
  m9: 508,
  skeleton: 525,
  nomad: 521,
  bayonet: 500,
  talon: 523,
  classic: 503,
  stiletto: 522,
  flip: 505,
  ursus: 519,
  paracord: 517,
  survival: 518,
  huntsman: 509,
  falchion: 512,
  bowie: 514,
  daggers: 516,
  gut: 506,
  navaja: 520,
};

async function giveKnife(caller, knifeName) {
  const callerPawn = caller.GetPlayerPawn();

  const name = `${knifeName}_${caller.GetPlayerSlot()}_${Math.floor(Instance.GetGameTime() * 1000)}`;
  Instance.ServerCommand(
    `ent_create ${KNIFE_CLASSES[knifeName]} {"targetname" "${name}"}`,
  );

  for (let attempts = 0; attempts < 20; attempts++) {
    const knifeEnt = Instance.FindEntityByName(name);
    if (knifeEnt) {
      callerPawn.DestroyWeapon(callerPawn.FindWeaponBySlot(2));
      knifeEnt.SetParent(callerPawn);
      return;
    }
    await Delay(0.1);
  }
  echoMessageToPlayer(caller, `giveKnife: gave up waiting for ${name}`);
}

function giveItem(caller, item) {
  const callerPawn = caller.GetPlayerPawn();
  callerPawn.GiveNamedItem(item);
}

const clearActions = {
  smoke: () => {
    Instance.ServerCommand("ent_remove_all smokegrenade_projectile");
  },
  fire: () => {
    Instance.ServerCommand("ent_remove_all inferno");
  },
  decoys: () => {
    Instance.ServerCommand("ent_remove_all decoy_projectile");
  },
  weapons: () => {
    removeDroppedWeapons();
  },
};

function clear(caller, target) {
  const action = clearActions[target];
  if (!action) {
    echoMessageToPlayer(
      caller,
      `Unknown clear target: ${target}. !help !clear for help`,
    );
    return;
  }
  action();
  echoMessageToPlayer(caller, `Cleared all ${target}`);
}

const giveActions = {
  item: (caller, item) => {
    giveItem(caller, item);
  },
  knife: (caller, item) => {
    giveKnife(caller, item);
  },
  preset: (caller, item) => {
    givePreset(caller, item);
  },
};

function give(caller, type, item) {
  const action = giveActions[type];

  if (!action) {
    echoMessageToPlayer(
      caller,
      `Unknown give type: ${type}. !help !give for help`,
    );
    return;
  }

  action(caller, item);

  echoMessageToPlayer(caller, `Gave ${type} ${item}`);
}

function help(caller, command) {
  if (command) {
    echoMessageToPlayer(
      caller,
      `${command} - ${commands[command].description}`,
    );
  } else {
    Object.entries(commands).forEach(([commandName, data]) => {
      echoMessageToPlayer(caller, `${commandName} - ${data.description}`);
    });
  }
}

const commands = {
  "!help": {
    description: "Shows help for commands. Usage: !help <commandName?>",
    minArgs: 0,
    action: (player, args) => {
      help(player, args[0] ?? null);
    },
  },
  "!give": {
    description: `Gives player specified target. Usage: !give <${Object.keys(giveActions).join("/")}> <itemType (give equivalent/!knives/!presets)>`,
    minArgs: 2,
    action: (player, args) => {
      give(player, args[0], args[1]);
    },
  },
  "!knives": {
    description: "Shows a list of knives to !give knife",
    minArgs: 0,
    action: (player, _) => {
      listKnives(player);
    },
  },
  "!presets": {
    description: "Shows a list of presets to !give preset",
    minArgs: 0,
    action: (player, _) => {
      listPresets(player);
    },
  },
  "!clear": {
    description: `Clears specified target. Usage: !clear <${Object.keys(clearActions).join("/")}>`,
    minArgs: 1,
    action: (player, args) => {
      clear(player, args[0]);
    },
  },
  // !check, !tele and !tpto instead of !cp, !tp and !goto to not conflict with cs2kz if used
  "!check": {
    description: "Places a checkpoint in player's current position.",
    minArgs: 0,
    action: (player, _) => {
      checkpoint(player);
    },
  },
  "!tele": {
    description: "Teleports player to their last checkpoint position.",
    minArgs: 0,
    action: (player, _) => {
      teleport(player);
    },
  },
  "!tpto": {
    description:
      "Teleports player to a specified player. Usage: !tpto <playerName>",
    minArgs: 1,
    action: (player, args) => {
      goto(player, args[0]);
    },
  },
  "!place": {
    description:
      "Places specified player/self according to player's cursor. Usage: !place <playerName?>",
    minArgs: 0,
    action: (player, args) => {
      placePlayer(player, args[0] ?? player.GetPlayerName());
    },
  },
  "!kill": {
    description: "Kills specified player/self. Usage: !kill <playerName?>",
    minArgs: 0,
    action: (player, args) => {
      killPlayer(player, args[0] ?? player.GetPlayerName());
    },
  },
  // shouldnt conflict with cs2kz, need to test
  "!spec": {
    description: "Puts player/self to spectators. Usage: !spec <playerName?>",
    minArgs: 0,
    action: (player, args) => {
      movePlayerToTeam(player, args[0] ?? player.GetPlayerName(), 1);
    },
  },
  "!t": {
    description: "Puts player/self to terrorist. Usage: !t <playerName?>",
    minArgs: 0,
    action: (player, args) => {
      movePlayerToTeam(player, args[0] ?? player.GetPlayerName(), 2);
    },
  },
  "!ct": {
    description: "Puts player/self to counter-terrorists. !ct <playerName?>",
    minArgs: 0,
    action: (player, args) => {
      movePlayerToTeam(player, args[0] ?? player.GetPlayerName(), 3);
    },
  },
  "!showdamage": {
    description: "Toggle show dealt damage in console.",
    minArgs: 0,
    action: (player, _) => {
      toggleFlag(player, "showDamage");
    },
  },
};

function ping(caller, name) {
  const playerController = findPlayerController(name);
  if (!playerController) {
    echoMessageToPlayer(caller, `Player ${name} not found`);
  }
  Instance.ClientCommand(
    playerController.GetPlayerSlot(),
    "play sounds/training/bell_normal.vsnd",
  );
}

Instance.OnPlayerChat(({ player, text }) => {
  if (text.startsWith("@")) {
    const parts = text.match(/^@(\S+)/);
    const playerName = parts[1];
    ping(player, playerName);
  }

  if (text.startsWith("!")) {
    const parts = text
      .replace(/[\u200B\u200C\u200D\uFEFF]/g, "") // remove invisible characters
      .match(/"[^"]*"|\S+/g)
      .map((p) => p.replace(/^"|"$/g, ""));

    const commandName = parts[0];
    const args = parts.slice(1);

    const command = commands[commandName];

    if (!command) return;

    if (args.length < command.minArgs) {
      echoMessageToPlayer(
        player,
        `${commandName} requires ${command.minArgs} arguments`,
      );
      return;
    }

    command.action(player, args);
  }
});

const flags = {
  showDamage: false,
};

function toggleFlag(caller, name) {
  flags[name] = !flags[name];
  echoMessageToPlayer(caller, `${name} is now ${flags[name]}`);
}

function printDamage(damage, player, weapon, inflictor) {
  if (!weapon || !inflictor) return;
  if (inflictor.GetClassName() !== "player") return;

  const playerController = player.GetPlayerController();
  const attackerController = weapon.GetOwner().GetPlayerController();

  const rawPlayerName = playerController.GetPlayerName();
  const rawAttackerName = attackerController.GetPlayerName();

  const playerName = playerController.IsBot()
    ? `BOT ${rawPlayerName}`
    : rawPlayerName;
  const attackerName = attackerController.IsBot()
    ? `BOT ${rawAttackerName}`
    : rawAttackerName;

  const damageString = `[Damage] ${attackerName} -> ${playerName} (-${damage}hp)`;
  echoMessageToPlayer(attackerController, damageString);
  echoMessageToPlayer(playerController, damageString);
}

Instance.OnPlayerDamage(({ damage, player, weapon, inflictor }) => {
  if (flags.showDamage) {
    printDamage(damage, player, weapon, inflictor);
  }
});
