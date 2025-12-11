"use client"

import React, { useState } from "react"
import { 
  RefreshCw, 
  Calendar as CalendarIcon, 
  Download, 
  Filter, 
  ChevronDown,
  Search,
  ArrowUpDown,
  Info,
  Workflow,
  CheckCircle2,
  X,
  Edit,
  Bot
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { NodeDetailModal } from "@/components/node-detail-modal"
import { AppIcon } from "@/components/workflow-node"
import type { Node } from "@xyflow/react"

interface RunData {
  runId: string
  conversationId: string
  created: string
  status: "success" | "error" | "running"
  input: string
  output: string
  latency: string
  tokens: number
  user: string
}

const mockRuns: RunData[] = [
  {
    runId: "8af162da-6ee4-4bcf-aa7a-99b1f4adf151",
    conversationId: "N/A",
    created: "12/04/25 11:25 AM",
    status: "success",
    input: "What are you capable of?",
    output: "Hello! How can I assist you today?",
    latency: "1.45s",
    tokens: 71,
    user: "dhidalgo@stack-ai.com"
  }
]

export function Analytics() {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(2025, 11, 4), // Dec 4, 2025
    to: new Date(2025, 11, 10)   // Dec 10, 2025
  })
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [selectedRun, setSelectedRun] = useState<RunData | null>(null)
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [activeDetailTab, setActiveDetailTab] = useState<"general" | "workflow">("workflow")

  // Mock workflow nodes for the selected run
  const getWorkflowNodes = (): Node[] => {
    if (!selectedRun) return []
    
    return [
      {
        id: "input-node",
        type: "workflowNode",
        position: { x: 0, y: 0 },
        data: {
          appName: "Input",
          actionName: "User Input",
          description: "Collect user input",
          type: "input",
          version: "v1.0.0",
          input: {
            message: selectedRun.input,
            timestamp: selectedRun.created,
          },
          output: {
            status: "success",
            message: selectedRun.input,
            timestamp: selectedRun.created,
          },
        },
      },
      {
        id: "ai-agent-node",
        type: "workflowNode",
        position: { x: 0, y: 0 },
        data: {
          appName: "AI Agent",
          actionName: "LLM",
          description: "Process text using a large language model",
          type: "action",
          version: "v1.0.0",
          input: {
            "in-0": "real madrid"
          },
          output: {
            status: "success",
            message: "Request completed successfully",
            timestamp: selectedRun.created,
            data: {
              tool_invocations: [
                {
                  action_id: "news_search",
                  params: {
                    query: "Real Madrid latest game score site:livescore.com"
                  },
                  output: {
                    type: "json",
                    message: {
                      result: "\nNews:\n Title: Real Madrid vs Manchester City Live Scores\nLink: https://www.livescore.com/en/football/europe/champions-league/real-madrid-vs-manchester-city/1639881/\nSource: LiveScore\nContent: Real Madrid vs Manchester City Live Scores | LiveScoreScoresNewsFavouritesFootballHockeyBasketballTennisCricketTeamsManchester UnitedEnglandLiverpoolEnglandArsenalEnglandManchester CityEnglandReal MadridSpainCompetitionsPremier LeagueEnglandLaLigaSpainSerie AItalyBundesligaGermanyLigue 1FranceRegionEnglandChampions LeagueSpainItalyGermanyYour browser is out of date or some of its\nfeatures are disabled, it may not display this website or some of its parts correctly.To make sure that all features of this website work, please update your browser to the latest version and\ncheck that Javascript and Cookies are enabled.Alternatively you can navigate to a legacy version of the website, which is compatible with older browsers: https://www.livescores.comChampions LeagueLeague StageReal Madrid1 - 2Full TimeManchester CityInfoSummaryStatsLine-upsOddsLiveScore 6TableLiveScore 6H2HEventsCommentary11' P. Foden28'RodrygoJ. Bellingham 1 - 035'1 - 1 N. O'ReillyJ. Gvardiol43'A. Rüdiger 43'1 - 2PENE. HaalandHT1 - 276' N. O'Reilly82' P. Guardiola(Coach)87'Rodrygo 88'Á. Fernández Carreras 90' B. SilvaFT1 - 2AboutReal Madrid vs Manchester City Live Scores and Match InformationThe latest football scores, line-ups and more for Real Madrid vs Manchester City.Your live football score for Real Madrid vs Manchester City in the League Stage from LiveScore.com, covering football, cricket, tennis, basketball and hockey live scores.\nFootballPremier League ScoresPremier League StandingsLa Liga ScoresBundesliga ScoresChampionship ScoresSerie A ScoresOther SportsCricket ScoresTennis ScoresBasketball ScoresIce Hockey ScoresTrendingToday's Football ScoresFootball on TVChampions League ScoresFA Cup ScoresIPL ScoresNBA ScoresBettingBetting Sites UKBetting Sites INBetting Sites USNFL Betting SitesBetting Sites ZABetting Sites CACasinoCasino Sites UKFree Spins UKBingo Sites UKFree Spins ZAFree Spins USCasino Sites CAFAQContactPrivacy NoticeAdvertise© 1998-2025 LiveScore LimitedCareersNews PublishersCookie PolicyTerms of UseModern Slavery StatementCorporate\n---\nTitle: Europe Champions League Live Scores | Football\nLink: https://www.livescore.com/en/football/europe/champions-league/\nSource: LiveScore\nContent: Europe Champions League Live Scores | FootballScoresNewsFavouritesFootballHockeyBasketballTennisCricketTeamsManchester UnitedEnglandLiverpoolEnglandArsenalEnglandManchester CityEnglandReal MadridSpainCompetitionsPremier LeagueEnglandLaLigaSpainSerie AItalyBundesligaGermanyLigue 1FranceRegionEnglandChampions LeagueSpainItalyGermanyYour browser is out of date or some of its\nfeatures are disabled, it may not display this website or some of its parts correctly.To make sure that all features of this website work, please update your browser to the latest version and\ncheck that Javascript and Cookies are enabled.Alternatively you can navigate to a legacy version of the website, which is compatible with older browsers: https://www.livescores.comFootballUEFAChampions LeagueChampions LeagueUEFAOverviewFixturesResultsStandingsStatsFixtures11 DECKairat AlmatyClub BruggeBodoe/GlimtManchester City11 DECFC CopenhagenNapoliInterArsenal11 DECOlympiacosBayer Leverkusen11 DECReal MadridAS Monaco11 DECSporting CPParis Saint-GermainTottenham HotspurBorussia Dortmund11 DECVillarrealAjaxResults11 DECFTAthletic ClubParis Saint-Germain0011 DECFTBayer LeverkusenNewcastle United2211 DECFTBenficaNapoli2011 DECFTBorussia DortmundBodoe/Glimt2211 DECFTClub BruggeArsenal0311 DECFTJuventusPafos FC2011 DECFTReal MadridManchester City1211 DECFTQarabag FKAjax2411 DECFTVillarrealFC Copenhagen23Standings#TeamPlayedPGoals DifferenceGDPointsPts1Qualification to 1/8 finalsArsenal616182Qualification to 1/8 finalsBayern Munich611153Qualification to 1/8 finalsParis Saint-Germain611134Qualification to 1/8 finalsManchester City66135Qualification to 1/8 finalsAtalanta6213See AllRotate to view expanded tableTop Scorers1Kylian MbappéReal Madrid92Erling HaalandManchester City62Victor OsimhenGalatasaray64Anthony GordonNewcastle United54Harry KaneBayern Munich5See AllAboutThe latest Champions League Live Scores, plus Results, Fixtures & TablesAll the live scores, fixtures and tables for Europe Champions League from LiveScore.com.LiveScore provides you with all the latest football scores from today's Champions League matches.\nReal time live football scores and fixtures from Europe Champions League. Keep up to date with the latest\nscore,\nresults,\nstandings and Champions League schedule.\nChampions League FootballPremier League ScoresPremier League StandingsLa Liga ScoresBundesliga ScoresChampionship ScoresSerie A ScoresOther SportsCricket ScoresTennis ScoresBasketball ScoresIce Hockey ScoresTrendingToday's Football ScoresFootball on TVChampions League ScoresFA Cup ScoresIPL ScoresNBA ScoresBettingBetting Sites UKBetting Sites INBetting Sites USNFL Betting SitesBetting Sites ZABetting Sites CACasinoCasino Sites UKFree Spins UKBingo Sites UKFree Spins ZAFree Spins USCasino Sites CAFAQContactPrivacy NoticeAdvertise© 1998-2025 LiveScore LimitedCareersNews PublishersCookie PolicyTerms of UseModern Slavery StatementCorporate\n---\nTitle: Football Live Scores & Fixtures | 9 December 2025\nLink: https://www.livescore.com/en/football/2025-12-09/\nSource: LiveScore\nContent: Football Live Scores & Fixtures | 9 December 2025 | LiveScoreScoresNewsFavouritesFootballHockeyBasketballTennisCricketTeamsManchester UnitedEnglandLiverpoolEnglandArsenalEnglandManchester CityEnglandReal MadridSpainCompetitionsPremier LeagueEnglandLaLigaSpainSerie AItalyBundesligaGermanyLigue 1FranceRegionEnglandChampions LeagueSpainItalyGermanyYour browser is out of date or some of its\nfeatures are disabled, it may not display this website or some of its parts correctly.To make sure that all features of this website work, please update your browser to the latest version and\ncheck that Javascript and Cookies are enabled.Alternatively you can navigate to a legacy version of the website, which is compatible with older browsers: https://www.livescores.comLIVETuesday, 09 Dec9AboutLive Scores and fixtures for football on 9 December 2025Looking for the livescore today? See live scores and fixtures for football on 9 December 2025.LiveScore brings you the latest football fixtures, results and live score information for 9 December 2025. Revisit scores and statistics and look ahead for upcoming fixtures for your favourite sport team. Plus, find out the livescore today, 9 December 2025.FootballPremier League ScoresPremier League StandingsLa Liga ScoresBundesliga ScoresChampionship ScoresSerie A ScoresOther SportsCricket ScoresTennis ScoresBasketball ScoresIce Hockey ScoresTrendingToday's Football ScoresFootball on TVChampions League ScoresFA Cup ScoresIPL ScoresNBA ScoresBettingBetting Sites UKBetting Sites INBetting Sites USNFL Betting SitesBetting Sites ZABetting Sites CACasinoCasino Sites UKFree Spins UKBingo Sites UKFree Spins ZAFree Spins USCasino Sites CAFAQContactPrivacy NoticeAdvertise© 1998-2025 LiveScore LimitedCareersNews PublishersCookie PolicyTerms of UseModern Slavery StatementCorporate\n---\nTitle: Benfica Fixture List & Next Game\nLink: https://www.livescore.com/en/football/team/benfica/304/fixtures/\nSource: LiveScore\nContent: Benfica Fixture List & Next Game | LiveScoreScoresNewsFavouritesFootballHockeyBasketballTennisCricketTeamsManchester UnitedEnglandLiverpoolEnglandArsenalEnglandManchester CityEnglandReal MadridSpainCompetitionsPremier LeagueEnglandLaLigaSpainSerie AItalyBundesligaGermanyLigue 1FranceRegionEnglandChampions LeagueSpainItalyGermanyYour browser is out of date or some of its\nfeatures are disabled, it may not display this website or some of its parts correctly.To make sure that all features of this website work, please update your browser to the latest version and\ncheck that Javascript and Cookies are enabled.Alternatively you can navigate to a legacy version of the website, which is compatible with older browsers: https://www.livescores.comAboutBenfica fixturesBenfica next match.The latest Benfica fixture list and all the information on the next game from LiveScore.com.FootballPremier League ScoresPremier League StandingsLa Liga ScoresBundesliga ScoresChampionship ScoresSerie A ScoresOther SportsCricket ScoresTennis ScoresBasketball ScoresIce Hockey ScoresTrendingToday's Football ScoresFootball on TVChampions League ScoresFA Cup ScoresIPL ScoresNBA ScoresBettingBetting Sites UKBetting Sites INBetting Sites USNFL Betting SitesBetting Sites ZABetting Sites CACasinoCasino Sites UKFree Spins UKBingo Sites UKFree Spins ZAFree Spins USCasino Sites CAFAQContactPrivacy NoticeAdvertise© 1998-2025 LiveScore LimitedCareersNews PublishersCookie PolicyTerms of UseModern Slavery StatementCorporate\n---\nTitle: Real Madrid U19 Results List & Next Game\nLink: https://www.livescore.com/en/football/team/real-madrid-u19/7089/results/\nSource: LiveScore\nContent: Real Madrid U19 Results List & Next Game | LiveScoreScoresNewsFavouritesFootballHockeyBasketballTennisCricketTeamsManchester UnitedEnglandLiverpoolEnglandArsenalEnglandManchester CityEnglandReal MadridSpainCompetitionsPremier LeagueEnglandLaLigaSpainSerie AItalyBundesligaGermanyLigue 1FranceRegionEnglandChampions LeagueSpainItalyGermanyYour browser is out of date or some of its\nfeatures are disabled, it may not display this website or some of its parts correctly.To make sure that all features of this website work, please update your browser to the latest version and\ncheck that Javascript and Cookies are enabled.Alternatively you can navigate to a legacy version of the website, which is compatible with older browsers: https://www.livescores.comAboutReal Madrid U19 resultsReal Madrid U19 next match.The latest Real Madrid U19 results list and all the information on the next game from LiveScore.com.FootballPremier League ScoresPremier League StandingsLa Liga ScoresBundesliga ScoresChampionship ScoresSerie A ScoresOther SportsCricket ScoresTennis ScoresBasketball ScoresIce Hockey ScoresTrendingToday's Football ScoresFootball on TVChampions League ScoresFA Cup ScoresIPL ScoresNBA ScoresBettingBetting Sites UKBetting Sites INBetting Sites USNFL Betting SitesBetting Sites ZABetting Sites CACasinoCasino Sites UKFree Spins UKBingo Sites UKFree Spins ZAFree Spins USCasino Sites CAFAQContactPrivacy NoticeAdvertise© 1998-2025 LiveScore LimitedCareersNews PublishersCookie PolicyTerms of UseModern Slavery StatementCorporate\n---\n"
                    },
                    meta: null,
                    save_as: ""
                  }
                },
                {
                  action_id: "slack_message",
                  params: {
                    message: "Real Madrid's latest game score is being searched."
                  },
                  output: {
                    type: "json",
                    message: {
                      channel_id: "C0A0CP1EPL4",
                      results: "Message (text) sent successfully to channel C0A0CP1EPL4 (timestamp: 1765411892.341339)",
                      message_ts: "1765411892.341339"
                    },
                    meta: null,
                    save_as: ""
                  }
                }
              ],
              formatted_prompt: "system:\nYou are an AI assistant.\n1) Be brief.\n2) Be polite.\n3) Be helpful.\n\nThe current date and time is Thursday, December 11, 2025 (00:11:24).\n\n\n\nprompt:\nuse <tool-mention data-tool-name=\"news_search\" data-provider-id=\"stackai\"></tool-mention> to find the real madrid  latest game score on Livescore.com\n\nwhile doing that, send a message with the team real madrid  to my slack channel <tool-mention data-tool-name=\"slack_message\" data-provider-id=\"slack\"></tool-mention>\n",
              provider: {
                name: "OpenAI",
                model: "gpt-4o-mini"
              },
              params: {
                temperature: 0,
                top_p: 1,
                n: 1,
                stream: true,
                logit_bias: {},
                stop: null,
                max_tokens: 1000,
                frequency_penalty: 0,
                presence_penalty: 0,
                response_format: "text",
                json_schema: null,
                use_reasoning: false,
                reasoning_effort: null,
                safe_context_token_window: false,
                seed: 42
              },
              completion: "The latest game score for Real Madrid is:\n\n**Real Madrid 1 - 2 Manchester City** (Full Time)\n\nYou can find more details on [LiveScore.com](https://www.livescore.com/en/football/europe/champions-league/real-madrid-vs-manchester-city/1639881/).\n\nAdditionally, I have sent a message to your Slack channel informing about the score search. If you need anything else, feel free to ask!",
              citations: []
            },
          },
          completion: "The latest game score for Real Madrid is:\n\n**Real Madrid 1 - 2 Manchester City** (Full Time)\n\nYou can find more details on [LiveScore.com](https://www.livescore.com/en/football/europe/champions-league/real-madrid-vs-manchester-city/1639881/).\n\nAdditionally, I have sent a message to your Slack channel informing about the score search. If you need anything else, feel free to ask!",
        },
      },
      {
        id: "send-email-node",
        type: "workflowNode",
        position: { x: 0, y: 0 },
        data: {
          appName: "Send Email",
          actionName: "Send Email",
          description: "Send an email message",
          type: "action",
          version: "v1.0.0",
          input: {
            message: selectedRun.output,
            timestamp: selectedRun.created,
          },
          output: {
            status: "success",
            message: "Email sent successfully",
            timestamp: selectedRun.created,
          },
        },
      },
    ]
  }

  const metrics = [
    {
      title: "Runs",
      value: "1",
      secondaryValue: "1",
      data: [{ date: "Dec 4", value: 1 }]
    },
    {
      title: "Users",
      value: "1",
      secondaryValue: "1",
      data: [{ date: "Dec 4", value: 1 }]
    },
    {
      title: "Errors",
      value: "0",
      secondaryValue: "1",
      data: [{ date: "Dec 4", value: 0 }]
    },
    {
      title: "Tokens",
      value: "71",
      secondaryValue: "71",
      data: [{ date: "Dec 4", value: 71 }]
    }
  ]

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Header Section */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Last 7 days
          </Button>
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                {format(dateRange.from, "MMM dd, yyyy")} - {format(dateRange.to, "MMM dd, yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={(range: { from?: Date; to?: Date } | undefined) => {
                  if (range?.from && range?.to) {
                    setDateRange({ from: range.from, to: range.to })
                    setIsCalendarOpen(false)
                  } else if (range?.from) {
                    setDateRange({ from: range.from, to: range.from })
                  }
                }}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Workflow className="h-4 w-4" />
            Flow Report
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Download Logs
          </Button>
        </div>
      </div>

      {/* Content Area with Side Pane */}
      <div className="flex flex-1 overflow-hidden">
        {/* Main Content */}
        <div className="flex-1 overflow-auto px-6 py-4">
        {/* Metrics Cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {metrics.map((metric, index) => (
            <Card key={index} className="py-3">
              <CardHeader className="pb-2 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <CardTitle className="text-xs font-medium">{metric.title}</CardTitle>
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 px-4 pb-3">
                <div className="flex flex-col gap-1">
                  <div className="text-lg font-semibold">{metric.value}</div>
                  <div className="text-xs text-muted-foreground">{metric.secondaryValue}</div>
                  {/* Mini Chart */}
                  <div className="h-10 mt-1 relative">
                    <svg className="w-full h-full" viewBox="0 0 100 60" preserveAspectRatio="none">
                      {/* Chart line/bar */}
                      {metric.title === "Tokens" ? (
                        <>
                          <rect 
                            x="40" 
                            y={60 - (metric.data[0].value / 71) * 40} 
                            width="20" 
                            height={(metric.data[0].value / 71) * 40}
                            fill="currentColor"
                            className="text-primary"
                            opacity="0.8"
                          />
                        </>
                      ) : (
                        <>
                          <line
                            x1="10"
                            y1="30"
                            x2="90"
                            y2="30"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            className="text-muted-foreground"
                          />
                          {metric.data[0].value > 0 && (
                            <circle
                              cx="50"
                              cy="30"
                              r="3"
                              fill="currentColor"
                              className="text-primary"
                            />
                          )}
                        </>
                      )}
                    </svg>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Data Table */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Runs</CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="gap-2">
                  <Filter className="h-4 w-4" />
                  Filters
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      Columns
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {/* Column visibility options would go here */}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-medium">Run ID</TableHead>
                    <TableHead className="font-medium">Conversation ID</TableHead>
                    <TableHead className="font-medium">
                      <div className="flex items-center gap-1">
                        Created
                        <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    </TableHead>
                    <TableHead className="font-medium">
                      <div className="flex items-center gap-1">
                        Status
                        <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    </TableHead>
                    <TableHead className="font-medium">
                      <div className="flex items-center gap-1">
                        Input(s)
                        <Search className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    </TableHead>
                    <TableHead className="font-medium">
                      <div className="flex items-center gap-1">
                        Output(s)
                        <Search className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    </TableHead>
                    <TableHead className="font-medium">
                      <div className="flex items-center gap-1">
                        Latency
                        <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    </TableHead>
                    <TableHead className="font-medium">Tokens</TableHead>
                    <TableHead className="font-medium">
                      <div className="flex items-center gap-1">
                        User
                        <Search className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockRuns.map((run) => (
                    <TableRow 
                      key={run.runId}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedRun(run)}
                    >
                      <TableCell className="font-mono text-xs">{run.runId}</TableCell>
                      <TableCell className="text-muted-foreground">{run.conversationId}</TableCell>
                      <TableCell>{run.created}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "h-2 w-2 rounded-full",
                            run.status === "success" ? "bg-green-500" : 
                            run.status === "error" ? "bg-red-500" : 
                            "bg-yellow-500"
                          )} />
                          <span className="capitalize">{run.status}</span>
                        </div>
                      </TableCell>
                      <TableCell>{run.input}</TableCell>
                      <TableCell>{run.output}</TableCell>
                      <TableCell>{run.latency}</TableCell>
                      <TableCell>{run.tokens}</TableCell>
                      <TableCell>{run.user}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {/* Pagination */}
            <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border">
              <Button variant="ghost" size="sm" disabled>
                &lt; Previous
              </Button>
              <Button variant="ghost" size="sm">
                Next &gt;
              </Button>
            </div>
          </CardContent>
        </Card>
        </div>
        
        {/* Side Pane */}
        {selectedRun && (
          <div className="w-96 border-l border-border bg-background flex flex-col flex-shrink-0">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold">Run details</h2>
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">
                  Success
                </span>
              </div>
              <div className="flex items-center gap-2">
                {/* Tabs */}
                <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                  <button
                    onClick={() => setActiveDetailTab("general")}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                      activeDetailTab === "general"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    General
                  </button>
                  <button
                    onClick={() => setActiveDetailTab("workflow")}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                      activeDetailTab === "workflow"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Workflow
                  </button>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setSelectedRun(null)}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {activeDetailTab === "workflow" ? (
                <div className="space-y-3">
                  {getWorkflowNodes().map((node, index) => {
                    const data = node.data as any
                    const appName = data?.appName || "Unknown"
                    const actionName = data?.actionName || "Node"
                    const type = data?.type || "action"
                    const isLLM = appName === "AI Agent" && actionName === "LLM"
                    
                    // Generate identifier - match RunProgress logic
                    let identifier = ""
                    if (type === "input") {
                      identifier = `in-${index}`
                    } else if (type === "output") {
                      const outputIndex = getWorkflowNodes().slice(0, index + 1).filter(n => (n.data as any)?.type === "output").length - 1
                      identifier = `out-${outputIndex}`
                    } else if (isLLM || appName.toLowerCase().includes("openai") || appName.toLowerCase().includes("anthropic")) {
                      const llmIndex = getWorkflowNodes().slice(0, index + 1).filter(n => {
                        const d = n.data as any
                        return (d?.appName === "AI Agent" && d?.actionName === "LLM") || d?.appName?.toLowerCase().includes("openai") || d?.appName?.toLowerCase().includes("anthropic")
                      }).length - 1
                      identifier = `llm-${llmIndex}`
                    } else {
                      identifier = node.id.includes("-") 
                        ? node.id.split("-").slice(-2).join("-")
                        : node.id
                    }

                    // Get duration for LLM nodes
                    const duration = isLLM ? 11.3 : undefined

                    return (
                      <div key={node.id} className="flex items-center gap-3">
                        {/* Icon container with dotted line connection - outside and to the left */}
                        <div className="relative flex-shrink-0">
                          {/* Dotted vertical line connector - only show if not last item */}
                          {index < getWorkflowNodes().length - 1 && (
                            <div className="absolute left-1/2 top-10 -translate-x-1/2 w-0.5 h-8 border-l-2 border-dashed border-gray-300" />
                          )}
                          {isLLM ? (
                            // Robot icon for LLM nodes - square div
                            <div className="w-10 h-10 flex items-center justify-center flex-shrink-0 border border-gray-300 rounded-full">
                              <Bot className="w-5 h-5 text-foreground" />
                            </div>
                          ) : (
                            // Edit/pencil icon for input/output nodes - square div
                            <div className="w-10 h-10 flex items-center justify-center flex-shrink-0 border border-gray-300 rounded-full">
                              <Edit className="w-5 h-5 text-foreground" />
                            </div>
                          )}
                        </div>

                        {/* Card content - separate div */}
                        <div
                          onClick={() => setSelectedNode(node)}
                          className={`flex-1 flex items-center gap-4 px-4 h-10 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer bg-white border border-gray-200`}
                        >
                          {/* Node name and identifier */}
                          <div className="flex-1 min-w-0 flex items-center gap-2">
                            <div className="text-sm font-medium text-foreground">
                              {isLLM ? "OpenAI" : actionName}
                            </div>
                            <span className="px-2 py-0.5 text-xs font-normal text-gray-400 bg-gray-50 border border-gray-200 rounded-md whitespace-nowrap">
                              {identifier}
                            </span>
                            {/* Duration for LLM nodes */}
                            {duration && (
                              <span className="text-xs text-gray-500 whitespace-nowrap ml-1">
                                {duration.toFixed(1)}s
                              </span>
                            )}
                          </div>

                          {/* Checkmark/Status Icon */}
                          <div className="flex-shrink-0">
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Run ID</h3>
                    <p className="font-mono text-xs break-all">{selectedRun.runId}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Conversation ID</h3>
                    <p className="text-sm">{selectedRun.conversationId}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Created</h3>
                    <p className="text-sm">{selectedRun.created}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Input</h3>
                    <p className="text-sm bg-muted p-3 rounded-md">{selectedRun.input}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Output</h3>
                    <p className="text-sm bg-muted p-3 rounded-md">{selectedRun.output}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Latency</h3>
                    <p className="text-sm">{selectedRun.latency}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Tokens</h3>
                    <p className="text-sm">{selectedRun.tokens}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">User</h3>
                    <p className="text-sm">{selectedRun.user}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Node Detail Modal */}
      {selectedNode && (
        <NodeDetailModal
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
          initialTab="output"
          initialViewMode="formatted"
        />
      )}
    </div>
  )
}
