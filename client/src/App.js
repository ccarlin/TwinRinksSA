import React, { useState, useEffect } from 'react';
import axios from 'axios';
import 'materialize-css/dist/css/materialize.min.css'; // Import Materialize CSS
// We might need M.AutoInit() or specific initializations later for Materialize JS components if not using react-materialize fully.
// import M from 'materialize-css';


// Placeholder components (to be created later)
import Header from './components/Header';
import Controls from './components/Controls';
import LeagueSelector from './components/LeagueSelector';
import TeamSelector from './components/TeamSelector';
import GameList from './components/GameList';
import NewsModal from './components/modals/NewsModal';
import UserModal from './components/modals/UserModal';
import ClearCookiesModal from './components/modals/ClearCookiesModal';
import CheckInModal from './components/modals/CheckInModal';
import Footer from './components/Footer';

function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Data states
  const [leagueList, setLeagueList] = useState([]);
  const [teamList, setTeamList] = useState([]);
  const [gameList, setGameList] = useState([]);
  const [selectedLeague, setSelectedLeague] = useState(null); // Store the label e.g. "leisure"
  const [selectedLeagueID, setSelectedLeagueID] = useState(0); // Store the ID/index
  const [selectedTeams, setSelectedTeams] = useState([]); // For multi-select teams
  const [showSubGames, setShowSubGames] = useState(false);
  const [userID, setUserID] = useState(null);
  const [userMessage, setUserMessage] = useState(null); // For general messages/errors from operations

  // Modal states
  const [isNewsModalOpen, setIsNewsModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isClearCookiesModalOpen, setIsClearCookiesModalOpen] = useState(false);
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
  const [checkInGameInfo, setCheckInGameInfo] = useState(null); // For which game to check in

  useEffect(() => {
    // M.AutoInit(); // Initialize Materialize components - might be needed if not using react-materialize for everything
    fetchMainData();
  }, []);

  const fetchMainData = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/main-data');
      const data = response.data;

      setLeagueList(data.leagueList || []);
      setTeamList(data.teamList || []);
      setGameList(data.gameList || []);
      setSelectedLeague(data.selectedLeague);
      setSelectedLeagueID(data.selectedLeagueID || 0);
      // Ensure selectedTeam is an array for react-select
      if (data.selectedTeam) {
        setSelectedTeams(data.selectedTeam.split(',').map(teamName => ({ value: teamName, label: teamName })));
      } else {
        setSelectedTeams([]);
      }
      setShowSubGames(data.showSubGames || false);
      setUserID(data.userID);
      setUserMessage(data.error); // Store message from initial load (e.g., "No league selected")
      if(data.error) {
        console.warn("Message from server (initial load):", data.error);
      }
      setError(null); // Clear critical error if data is successfully fetched, userMessage handles non-critical server messages

    } catch (err) {
      console.error("Error fetching main data:", err);
      const errorMessage = err.response?.data?.message || err.response?.data || err.message || 'Failed to load application data.';
      if (!gameList.length) { // If it's an initial load failure (no games ever loaded)
        setError(errorMessage);
        setUserMessage(null); // Clear any previous user message
      } else { // If it's a subsequent fetch failure after app has loaded once
        setUserMessage(errorMessage);
        setError(null); // Don't use critical error for subsequent failures
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLeagueChange = async (newLeagueValue) => {
    // newLeagueValue will be the 'value' property of the selected league option
    setLoading(true); // Show loading indicator
    try {
      // Find the league object to get its label and id for state update
      const leagueObj = leagueList.find(l => l.value === newLeagueValue);

      // POST to the backend to update cookies
      // The backend route '/' or '/twinrinks' expects 'leagueSelection'
      await axios.post('/twinrinks', { leagueSelection: newLeagueValue });

      // After successful POST, update client-side state immediately for responsiveness
      // and then re-fetch all data to ensure consistency with backend state.
      if (leagueObj) {
        setSelectedLeague(leagueObj.label);
        setSelectedLeagueID(leagueObj.id);
      } else {
        setSelectedLeague(null);
        setSelectedLeagueID(0); // Default or reset
      }
      setSelectedTeams([]); // Changing league should reset team selection

      fetchMainData(); // Re-fetch data to get new game list, team list etc. for the new league
      // setUserMessage('League selection updated.'); // Optional success message
    } catch (err) {
      console.error("Error updating league:", err);
      setUserMessage(err.response?.data || 'Failed to update league selection.');
      setLoading(false); // Ensure loading is turned off on error because fetchMainData might not run
    }
    // setLoading(false) will be handled by fetchMainData's finally block if fetchMainData is called
  };

  const handleTeamChange = async (newlySelectedTeamsOptions) => {
    // newlySelectedTeamsOptions is an array of { value: "TeamName", label: "TeamName" } or null
    setLoading(true);
    try {
      const teamNamesArray = newlySelectedTeamsOptions ? newlySelectedTeamsOptions.map(t => t.value) : [];

      // Get current league value to send along with team selection
      // Ensure leagueList is available and selectedLeagueID is valid
      let currentLeagueValue = "";
      if (leagueList.length > 0 && selectedLeagueID > 0) { // leagueID 0 is "Select Your League"
        const league = leagueList.find(l => l.id === selectedLeagueID);
        if (league) {
            currentLeagueValue = league.value;
        }
      }
      if (!currentLeagueValue && selectedLeague) { // Fallback if ID didn't match but label exists
        const leagueByLabel = leagueList.find(l => l.label === selectedLeague);
        if (leagueByLabel) currentLeagueValue = leagueByLabel.value;
      }


      // POST to the backend. It expects 'lblTeamList' and 'leagueSelection'.
      await axios.post('/twinrinks', {
        lblTeamList: teamNamesArray, // This should be an array of strings
        leagueSelection: currentLeagueValue // This is the value like "http://..."
      });

      setSelectedTeams(newlySelectedTeamsOptions || []); // Update state
      fetchMainData(); // Re-fetch all data
      // setUserMessage('Team selection updated.'); // Optional success message
    } catch (err) {
      console.error("Error updating team selection:", err);
      setUserMessage(err.response?.data || 'Failed to update team selection.');
      setLoading(false); // Ensure loading is turned off on error
    }
    // setLoading(false) is handled by fetchMainData's finally block
  };

  const handleOpenCheckInModal = (gameInfo) => {
    setCheckInGameInfo(gameInfo); // gameInfo should be { nodeName, displayText, gameDate }
    setIsCheckInModalOpen(true);
  };

  const handleSaveUserSettings = async (settings) => {
    // settings = { UserID, Password, ShowSubGames }
    setLoading(true); // Use a general loading state or a modal-specific one
    try {
      await axios.post('/saveUser', settings);
      // M.toast({ html: 'Settings saved!' }); // Will replace with a React notification system

      // Update App.js state based on what was saved
      if (settings.UserID !== undefined) setUserID(settings.UserID);
      if (settings.ShowSubGames !== undefined) setShowSubGames(settings.ShowSubGames);

      setIsUserModalOpen(false); // Close modal

      // Re-fetch main data because ShowSubGames might change the game list,
      // and other user-specific data might be affected by UserID change.
      fetchMainData();
      setUserMessage('Settings saved successfully!');
    } catch (err) {
      console.error("Error saving user settings:", err);
      setUserMessage(err.response?.data || 'Failed to save settings.');
      setLoading(false); // Turn off loading if error prevents fetchMainData
    }
    // setLoading(false) will be handled by fetchMainData's finally block if it runs
  };

  const handleClearCookies = async (options) => {
    // options = { ResetLeague, ResetUser } (boolean values)
    setLoading(true);
    try {
      await axios.post('/clearCookies', options);
      // M.toast({ html: 'Settings cleared!' });
      setIsClearCookiesModalOpen(false); // Close modal
      fetchMainData(); // Re-fetch data to get the default state after cookies are cleared
      setUserMessage('Settings cleared successfully!');
    } catch (err) {
      console.error("Error clearing cookies:", err);
      setUserMessage(err.response?.data || 'Failed to clear settings.');
      setLoading(false); // Ensure loading is turned off on error
    }
    // setLoading(false) will be handled by fetchMainData's finally block
  };

  const handleSaveGameCheckIn = async (gameNodeName, checkInSelected) => {
    // gameNodeName is like "g123", checkInSelected is true for 'in', false for 'out'
    setLoading(true);
    try {
      const payload = {
        // The backend expects the 'i' suffix on the gameNode for check-in/out actions
        games: [{ gameNode: gameNodeName + "i", checkIn: checkInSelected.toString() }]
      };
      const response = await axios.post('/gameLink', payload);

      if (response.data === "success") {
        // M.toast({ html: 'Check-in status saved! May take time to reflect.' });
        fetchMainData(); // Refresh game list to show updated status
      } else if (response.data && response.data.startsWith && response.data.startsWith("http")) {
        // M.toast({ html: 'Please log in to TwinRinks first.' });
        window.open(response.data, '_blank');
        setUserMessage("Redirecting to TwinRinks for login...");
      } else {
        // M.toast({ html: `Error: ${response.data}`, classes: 'red' });
        setUserMessage(response.data || "Unknown error during check-in.");
      }
      setIsCheckInModalOpen(false); // Close modal regardless of outcome
    } catch (err) {
      console.error("Error saving check-in status:", err);
      setUserMessage(err.response?.data || "Failed to save check-in status.");
      setLoading(false); // Turn off loading on error as fetchMainData might not run
    }
    // setLoading(false) will be handled by fetchMainData if successful (it is called in success case)
  };

  const handleGoToTwinRinks = async () => {
    setLoading(true);
    try {
      const response = await axios.post('/gameLink', { gameNode: null, checkIn: null });
      if (response.data && response.data.startsWith && response.data.startsWith("http")) {
        window.open(response.data, '_blank');
        setUserMessage("Redirecting to TwinRinks...");
      } else {
        setUserMessage(response.data || "Could not retrieve Twin Rinks link.");
      }
      setIsCheckInModalOpen(false);
    } catch (err) {
      console.error("Error getting Twin Rinks link:", err);
      setUserMessage(err.response?.data || "Failed to get Twin Rinks link.");
    } finally {
      setLoading(false);
    }
  };


  if (loading && !gameList.length && !error) { // Show initial loading only if no games AND no critical error yet
    // Consider a more visually appealing loading indicator later
    return <div className="container center-align" style={{paddingTop: '20px'}}><img src="/img/nyi-animated.gif" alt="Please Wait" /></div>;
  }

  if (error) { // This 'error' state is for critical initial load failures (page cannot function)
    return <div className="container center-align red-text" style={{paddingTop: '20px'}}>Error: {error}</div>;
  }

  return ( // Main app content
    <div className="container">
      <Header />

      <main>
        <Controls
          onOpenNewsModal={() => setIsNewsModalOpen(true)}
          onOpenUserModal={() => setIsUserModalOpen(true)}
          onOpenClearCookiesModal={() => setIsClearCookiesModalOpen(true)}
          selectedLeague={selectedLeague}
          selectedTeams={selectedTeams}
        />

        <LeagueSelector
          leagueList={leagueList}
          selectedLeagueID={selectedLeagueID}
          onLeagueChange={handleLeagueChange}
          disabled={loading}
        />

        <TeamSelector
          serverTeamList={teamList}
          selectedTeams={selectedTeams}
          onTeamChange={handleTeamChange}
          disabled={loading || !selectedLeague }
        />

        <GameList
          games={gameList}
          onOpenCheckInModal={handleOpenCheckInModal}
        />

        {userMessage &&
          <p
            className="center-align"
            style={{
              color: userMessage.toLowerCase().includes("fail") ||
                     userMessage.toLowerCase().includes("error") ||
                     userMessage.toLowerCase().includes("unable")
                     ? 'red' : 'green',
              marginTop: '10px'
            }}
          >
            {userMessage}
          </p>
        }

      </main>

      </Footer>

      <NewsModal
        isOpen={isNewsModalOpen}
        onClose={() => setIsNewsModalOpen(false)}
      />
      <UserModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        initialUserID={userID}
        initialShowSubGames={showSubGames}
        onSave={handleSaveUserSettings}
      />
      <ClearCookiesModal
        isOpen={isClearCookiesModalOpen}
        onClose={() => setIsClearCookiesModalOpen(false)}
        onClear={handleClearCookies}
      />
      <CheckInModal
        isOpen={isCheckInModalOpen}
        onClose={() => setIsCheckInModalOpen(false)}
        gameInfo={checkInGameInfo}
        onSaveCheckIn={handleSaveGameCheckIn}
        onGoToTwinRinks={handleGoToTwinRinks}
      />

      {loading && (
        <div style={{
          display: 'flex', // Use flex to center the image
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(200, 200, 200, 0.5)', // Semi-transparent background
          zIndex: 1050, // Ensure it's above other content, including modals
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <img src="/img/nyi-animated.gif" alt="Please Wait" />
        </div>
      )}
    </div>
  );
}

export default App;
