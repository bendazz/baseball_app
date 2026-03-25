const LEAGUE_NAMES = {
    AL: "American League",
    NL: "National League",
    AA: "American Association",
    UA: "Union Association",
    PL: "Players' League",
    FL: "Federal League",
    NA: "National Association",
};

const DIVISION_NAMES = {
    E: "East",
    C: "Central",
    W: "West",
};

function leagueName(code) {
    return LEAGUE_NAMES[code] || code || "Other";
}

function divisionName(code) {
    return DIVISION_NAMES[code] || code || "";
}

function buildTeamsHTML(teams, year) {
    // Group by league, then division
    const grouped = {};
    for (const t of teams) {
        const lg = t.league || "Other";
        const div = t.division || "";
        if (!grouped[lg]) grouped[lg] = {};
        if (!grouped[lg][div]) grouped[lg][div] = [];
        grouped[lg][div].push({ name: t.name, teamID: t.teamID });
    }

    const container = document.getElementById("teams-container");
    container.innerHTML = "";

    const leagues = Object.keys(grouped).sort();

    for (const lg of leagues) {
        const leagueDiv = document.createElement("div");
        leagueDiv.className = "league-group";

        const lgHeader = document.createElement("h3");
        lgHeader.className = "league-header";
        lgHeader.textContent = leagueName(lg);
        leagueDiv.appendChild(lgHeader);

        const divisions = Object.keys(grouped[lg]).sort();
        const hasDivisions = !(divisions.length === 1 && divisions[0] === "");

        const divisionsRow = document.createElement("div");
        divisionsRow.className = "divisions-row";

        for (const div of divisions) {
            const divBlock = document.createElement("div");
            divBlock.className = "division-block";

            if (hasDivisions) {
                const divHeader = document.createElement("h4");
                divHeader.className = "division-header";
                divHeader.textContent = divisionName(div);
                divBlock.appendChild(divHeader);
            }

            const ul = document.createElement("ul");
            for (const team of grouped[lg][div].sort((a, b) => a.name.localeCompare(b.name))) {
                const li = document.createElement("li");
                li.className = "team-item";
                li.textContent = team.name;
                li.dataset.teamId = team.teamID;
                li.addEventListener("click", () => loadRoster(year, team.teamID, team.name));
                ul.appendChild(li);
            }
            divBlock.appendChild(ul);
            divisionsRow.appendChild(divBlock);
        }

        leagueDiv.appendChild(divisionsRow);
        container.appendChild(leagueDiv);
    }
}

async function loadRoster(year, teamID, teamName) {
    const section = document.getElementById("roster-section");
    const heading = document.getElementById("roster-heading");
    const container = document.getElementById("roster-container");

    heading.textContent = `${teamName} — ${year} Roster`;
    container.innerHTML = '<p class="loading">Loading roster...</p>';
    section.hidden = false;
    document.getElementById("player-section").hidden = true;
    section.scrollIntoView({ behavior: "smooth" });

    // highlight selected team
    document.querySelectorAll(".team-item.active").forEach(el => el.classList.remove("active"));
    document.querySelector(`.team-item[data-team-id="${teamID}"]`)?.classList.add("active");

    try {
        const response = await fetch(`/roster?year=${year}&team=${teamID}`);
        const players = await response.json();

        if (players.length === 0) {
            container.innerHTML = '<p class="loading">No players found</p>';
            return;
        }

        const ul = document.createElement("ul");
        ul.className = "roster-list";
        for (const p of players) {
            const li = document.createElement("li");
            li.className = "roster-item";
            li.textContent = `${p.first} ${p.last}`;
            li.addEventListener("click", () => loadPlayer(p.playerID, p.first, p.last));
            ul.appendChild(li);
        }
        container.innerHTML = "";
        container.appendChild(ul);
    } catch {
        container.innerHTML = '<p class="loading">Failed to load roster</p>';
    }
}

function formatHeight(inches) {
    if (!inches) return "—";
    return `${Math.floor(inches / 12)}'${inches % 12}"`;
}

function formatDate(str) {
    if (!str) return "—";
    return str;
}

function val(v) {
    return v != null ? v : "—";
}

async function loadPlayer(playerID, first, last) {
    const section = document.getElementById("player-section");
    const heading = document.getElementById("player-heading");
    const container = document.getElementById("player-container");

    heading.textContent = `${first} ${last}`;
    container.innerHTML = '<p class="loading">Loading player...</p>';
    section.hidden = false;
    section.scrollIntoView({ behavior: "smooth" });

    // highlight selected player
    document.querySelectorAll(".roster-item.active").forEach(el => el.classList.remove("active"));
    event?.target?.classList.add("active");

    try {
        const response = await fetch(`/player?id=${encodeURIComponent(playerID)}`);
        const data = await response.json();

        if (data.error) {
            container.innerHTML = '<p class="loading">Player not found</p>';
            return;
        }

        const bio = data.bio;
        const batting = data.batting;

        // Build bio card
        const card = document.createElement("div");
        card.className = "player-card";

        const birthDate = [bio.birthMonth, bio.birthDay, bio.birthYear].filter(Boolean).join("/");
        const deathDate = bio.deathYear
            ? [bio.deathMonth, bio.deathDay, bio.deathYear].filter(Boolean).join("/")
            : null;

        card.innerHTML = `
            <div class="bio-grid">
                <div class="bio-item"><span class="bio-label">Full Name</span><span class="bio-value">${val(bio.nameGiven)} ${val(bio.nameLast)}</span></div>
                <div class="bio-item"><span class="bio-label">Born</span><span class="bio-value">${birthDate || "—"} — ${val(bio.birthCity)}, ${val(bio.birthState)}, ${val(bio.birthCountry)}</span></div>
                ${deathDate ? `<div class="bio-item"><span class="bio-label">Died</span><span class="bio-value">${deathDate}</span></div>` : ""}
                <div class="bio-item"><span class="bio-label">Height / Weight</span><span class="bio-value">${formatHeight(bio.height)} / ${bio.weight ? bio.weight + " lbs" : "—"}</span></div>
                <div class="bio-item"><span class="bio-label">Bats / Throws</span><span class="bio-value">${val(bio.bats)} / ${val(bio.throws)}</span></div>
                <div class="bio-item"><span class="bio-label">Debut</span><span class="bio-value">${formatDate(bio.debut)}</span></div>
                <div class="bio-item"><span class="bio-label">Final Game</span><span class="bio-value">${formatDate(bio.finalGame)}</span></div>
            </div>
        `;

        // Build batting table
        const tableWrap = document.createElement("div");
        tableWrap.className = "batting-table-wrap";

        const cols = ["Year","Team","G","AB","R","H","2B","3B","HR","RBI","SB","CS","BB","SO","IBB","HBP","SH","SF","GIDP"];
        const keys = ["yearID","teamName","G","AB","R","H","2B","3B","HR","RBI","SB","CS","BB","SO","IBB","HBP","SH","SF","GIDP"];

        let tableHTML = "<table class='batting-table'><thead><tr>";
        for (const c of cols) tableHTML += `<th>${c}</th>`;
        tableHTML += "</tr></thead><tbody>";
        for (const row of batting) {
            tableHTML += "<tr>";
            for (const k of keys) tableHTML += `<td>${val(row[k])}</td>`;
            tableHTML += "</tr>";
        }
        tableHTML += "</tbody></table>";
        tableWrap.innerHTML = tableHTML;

        container.innerHTML = "";
        container.appendChild(card);
        container.appendChild(tableWrap);
    } catch {
        container.innerHTML = '<p class="loading">Failed to load player</p>';
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    const select = document.getElementById("year-select");

    try {
        const response = await fetch("/years");
        const years = await response.json();

        select.innerHTML = '<option value="">-- Choose a season --</option>';
        years.forEach((year) => {
            const option = document.createElement("option");
            option.value = year;
            option.textContent = year;
            select.appendChild(option);
        });
        select.disabled = false;
    } catch {
        select.innerHTML = '<option value="">Failed to load seasons</option>';
    }

    select.addEventListener("change", async () => {
        const year = select.value;
        const section = document.getElementById("teams-section");
        const container = document.getElementById("teams-container");
        const heading = document.getElementById("teams-heading");

        document.getElementById("roster-section").hidden = true;
        document.getElementById("player-section").hidden = true;

        if (!year) {
            section.hidden = true;
            return;
        }

        container.innerHTML = '<p class="loading">Loading...</p>';
        heading.textContent = `${year} Season`;
        section.hidden = false;

        try {
            const response = await fetch(`/teams?year=${year}`);
            const teams = await response.json();
            buildTeamsHTML(teams, year);
        } catch {
            container.innerHTML = '<p class="loading">Failed to load teams</p>';
        }
    });
});
