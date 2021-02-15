var defaultTeams = ['accrington', 'everton', 'huddersfield', 'swansea', 'wigan'];

var allSeasons, allTeams, allTiers, allTierSizes;

var charter = chart();

// Create an element by name with optional text content and attributes.
//
function element(name, content, attributes) {
    var e = $(document.createElement(name));

    if (content) { e.append(content); }
    for (var a in attributes) { e.attr(a, attributes[a]); }

    return e;
}

function averagePositions(teams) {
    var min = parseInt($('#min-year').val()),
        max = parseInt($('#max-year').val()),
        out = {};

    $.each(teams, function(i, team) {
        var total = 0, count = 0;

        $.each(team.seasons, function(j, season) {
            var s = toSeason(season);

            if (s >= min && s <= max && season.effectivePosition) {
                total += season.effectivePosition;
                count += 1;
            }
        });

        out[team.team] = (total / count).toString().replace(/\.(\d{2})\d*/, '.$1');
    });

    return out;
}

function createTeamSelector(teams) {
    var teamList = $('#teams-unselected');
    var teamIDs = d3.keys(teams).sort();

    // Enable the filter box, which hides all items that don't match
    // the filter in their label's title. (The title attribute for the
    // label contains all of the team names found.)
    $('#team-filter').keyup(function() {
        var filter = $(this).val().toLowerCase();

        $('#teams-unselected > li').show().filter(function() {
            var comparator = $('label', this).attr('title').toLowerCase();

            return (comparator.indexOf(filter) === -1);
        }).hide();
    });

    for (var i = 0; i < teamIDs.length; i++) {
        var id = teamIDs[i];
        var team = teams[id];

        // The empty onclick is needed for iOS to activate the label.
        var label = element('label', team[0],
                            {'for': teamID(id), 'title': team.join(', '),
                             'onclick': ''});

        var input = element('input', '',
                            {'id': teamID(id), 'type': 'checkbox'});

        // A filled box for the chart key / legend.
        var key = element('span', '&#9632;', {'class': 'key'});

        // An empty element for the average position.
        var averagePosition = element('span', '', {'class': 'average-position'});

        input.change(function() { moveTeam($(this).parent()); redrawChart(); });

        teamList.append(element('li').append(key).append(input).append(label).append(averagePosition));
    }

    $('#options').show();
}

// Moves a team from the selected to unselected list, or vice versa. Inserts in
// alphabetical order by team ID.
//
function moveTeam(team) {
    var id = teamID(team);
    var inserted = false;

    var destination = '#teams-' +
            ($('input', team).attr('checked') ? '' : 'un') +
            'selected';

    $(destination + ' > li').each(function(i, item) {
        if (id < teamID(item) && !inserted) {
            $(item).before(team);

            inserted = true;
        }});

    if (!inserted) { $(destination).append(team); }
}

// If given a string, returns the team ID ('team-liverpool', for instance).
//
// If given a jQuery object, finds the ID attribute of the first input element
// it contains, and removes the 'team-' prefix from that.
//
function teamID(team) {
    if (team.substring) { return 'team-' + team; }

    return (team.id || $('input', team)[0].id).slice(5);
}

// Draw the chart with only the teams who are checked. If more than 10
// teams are selected, add a warning.
//
function redrawChart() {
    var teams = $.map($('#team-list input:checked'), teamID);

    if (teams.length > 10) {
        $('#too-many-teams-warning').show();
    } else {
        $('#too-many-teams-warning').hide();
    }

    d3.select('#chart').call(charter.chartTeams(teams.sort()).refresh);
}

// Clear the currently selected teams and instead check all of the teams in the
// list passed.
//
function selectTeams(teams) {
    $('#team-list input:checked').prop('checked', false).change();

    for (var i = 0; i < teams.length; i++) {
        $('#' + teamID(teams[i])).prop('checked', true).change();
    }
}

// Gets the ending year of the season from the object.
//
function toSeason(o) { return parseInt(o.season) + 1; }

function chart() {
    var my = {},
        width = 650,
        height = width / 2,
        padding = 20;

    var tierSizes, tierYears, stacked, leagueSize, x, y, xAxis, yAxis;
    var seasons, chartTeams, chartSeasons;

    var stack = d3.layout.stack()
            .values(function(d) { return d.seasons; })
            .x(function(d) { return toSeason(d); })
            .y(function(d) { return d.size; })
            .out(function(d, y0, y) { d.size0 = y0; });

    var area = d3.svg.area()
            .x(function(d) { return x(toSeason(d)); })
            .y0(function(d) { return y(d.size0); })
            .y1(function(d) { return (y(d.size0 + d.size)); });

    var line = d3.svg.line()
            .x(function(d) { return x(toSeason(d)); })
            .y(function(d) { return y(d.effectivePosition); })
            .defined(function(d) { return d.effectivePosition > 0; });

    my.width = function(_) {
        if (!arguments.length) return width; width = _; return my;
    };

    my.height = function(_) {
        if (!arguments.length) return height; height = _; return my;
    };

    my.tierSizes = function(_) {
        if (!arguments.length) return tierSizes;

        tierSizes = _;

        tierYears = $.map(tierSizes[0].seasons, function(s) {
            return toSeason(s);
        });

        $('#options .year')
            .change(function() { charter.range(); })
            .attr('min', d3.min(tierYears))
            .attr('max', d3.max(tierYears));

        my.range.apply(null, d3.extent(tierYears));

        stacked = stack($.extend(true, [], tierSizes));

        leagueSize = d3.max(d3.last(stacked).seasons, function(x) {
            return x.size + x.size0;
        });

        y = d3.scale.linear()
            .domain([1, leagueSize])
            .range([0, height - padding]);

        yAxis = d3.svg.axis().scale(y).orient('left');

        return my;
    };

    my.range = function(min, max) {
        // Get the arguments from the form if undefined; else, propogate to the
        // form.
        if (!arguments.length) {
            min = $('#min-year').val();
            max = $('#max-year').val();
        } else {
            $('#min-year').val(min);
            $('#max-year').val(max);
        };

        x = d3.scale.linear()
            .domain([min, max])
            .range([padding * 2, width - padding]);

        xAxis = d3.svg.axis().scale(x).tickFormat(d3.format('0f'));

        d3.select('#chart #x-axis').call(xAxis);

        d3.selectAll('#chart .line')
            .attr('d', function(d) { return line(d.seasons); });

        d3.selectAll('#chart .area')
            .attr('d', function(d) { return area(d.seasons); });

        return my;
    };

    my.seasons = function(_) {
        if (!arguments.length) return seasons; seasons = _; return my;
    };

    my.chartTeams = function(_) {
        if (!arguments.length) return chartTeams;

        chartTeams = _;

        chartSeasons = my.seasons().filter(function(teamSeasons) {
            return (chartTeams.indexOf(teamSeasons.team) > -1);
        });

        return my;
    };

    my.refresh = function(selection) {
        selection.each(function() {
            var color = d3.scale.category10(),
                lines = d3.select(this).select('#chart-body')
                    .selectAll('.line')
                    .data(chartSeasons, function (d) { return d.team; }),
                averagePosition = averagePositions(chartSeasons);

            lines.exit().remove();

            lines
                .enter()
                .append('path')
                .attr('d', function(d) { return line(d.seasons); })
                .classed('line', true)
                .attr('fill', 'none')
                .attr('stroke-width', 2);

            lines
                .attr('stroke', function(d) { return color(d.team); });

            // Colour in the legend items with the line colours.
            $.each(chartTeams, function(i, team) {
                var parent = $('#' + teamID(team)).parent();

                $('.key', parent).css('color', color(team));

                $('.average-position', parent).text(' (' + averagePosition[team] + ')');
            });
        });
    };

    my.init = function(selection) {
        selection.each(function() {
            d3.select(this).select('svg').remove();

            var vis = d3.select(this)
                    .insert('svg', '#options')
                    .attr('width', width)
                    .attr('height', height)
                    .append('g')
                    .attr('transform', 'translate(' + padding + ',0)');

            var clip = vis.append('defs').append('clipPath')
                    .attr('id', 'clip')
                    .append('rect')
                    .attr('id', 'clip-rect')
                    .attr('x', padding * 2)
                    .attr('y', 0)
                    .attr('width', width - padding * 2)
                    .attr('height', height);

            var chartBody = vis.append('g')
                    .attr('id', 'chart-body')
                    .attr('clip-path', 'url(#clip)');

            chartBody.selectAll('.area')
                .data(stacked)
                .enter()
                .append('path')
                .attr('d', function(d) { return area(d.seasons); })
                .classed('area', true)
                .attr('fill', '#eec')
                .attr('opacity', function(d, i) { return .3 + .5 * (i % 2); });

            vis.append('g')
                .attr('transform', 'translate(0,' + (height - padding) + ')')
                .classed('axis', true)
                .attr('id', 'x-axis')
                .call(xAxis);

            vis.append('g')
                .classed('axis', true)
                .attr('transform', 'translate(' + padding * 2 + ',0)')
                .call(yAxis);

            vis.append('text')
                .attr('transform', 'rotate(-90)')
                .attr('x', -height / 2)
                .attr('y', 0)
                .attr('text-anchor', 'middle')
                .text('Overall league position');
        });
    };

    return my;
}

d3.json('ext/football-league-positions.json', function(data) {
    allSeasons = data.seasons;
    allTeams = data.teams;
    allTiers = data.tiers;
    allTierSizes = data.tierSizes;

    d3.select('#chart').call(charter
                             .tierSizes(allTierSizes)
                             .seasons(allSeasons)
                             .init);

    createTeamSelector(allTeams);
    selectTeams(defaultTeams);
});
