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
            li.textContent = `${p.first} ${p.last}`;
            ul.appendChild(li);
        }
        container.innerHTML = "";
        container.appendChild(ul);
    } catch {
        container.innerHTML = '<p class="loading">Failed to load roster</p>';
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
