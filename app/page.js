'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL
export default function Home() {
  const { data: session, status } = useSession();

  const [spendingData, setSpendingData] = useState({
    daily: null,
    weekly: null,
    monthly: null
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('daily');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState(
    'Fetching the spendings, please wait...'
  );
  useEffect(() => {
    let timer;
    if (isLoading) {
      timer = setTimeout(() => {
        setLoadingMsg(
          "Uff! You did so many transactions. Don't worry, we'll fetch all of them—just wait please."
        );
      }, 3000);
    } else {
      // Reset to initial message when not loading.
      setLoadingMsg('Fetching the spendings, dont go anywhere...');
    }
    return () => clearTimeout(timer);
  }, [isLoading]);
  useEffect(() => {
    if (session) {
      if (activeTab === 'all') {
        fetchAllSpendingData();
      } else {
        fetchTabData(activeTab);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, activeTab]);

  const fetchTabData = async (tab) => {
    setIsLoading(true);
    setError(null);
    try {
      const accessToken = session?.accessToken;
      if (!accessToken) {
        throw new Error('No access token available; reauthenticate');
      }
      const response = await axios.get(
        `${API_BASE_URL}/transactions?filter=${tab}&access_token=${encodeURIComponent(accessToken)}`,
        { headers: { 'Content-Type': 'application/json' } }
      );
      setSpendingData((prev) => ({
        ...prev,
        [tab]: response.data,
      }));
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.error('Session expired. Please log out and sign in again.');
        setError('Session expired. Please log out and sign in again.');
        // Optionally auto-logout:
        signOut({ callbackUrl: '/' });
      } else {
        console.error('Error fetching spending data:', error);
        setError('Failed to fetch spending data. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllSpendingData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [dailyRes, weeklyRes, monthlyRes] = await Promise.all([
        axios.get('${API_BASE_URL}/transactions?filter=daily'),
        axios.get('${API_BASE_URL}/transactions?filter=weekly'),
        axios.get('${API_BASE_URL}/transactions?filter=monthly'),
      ]);

      setSpendingData({
        daily: dailyRes.data,
        weekly: weeklyRes.data,
        monthly: monthlyRes.data,
      });
    } catch (error) {
      console.error('Error fetching spending data:', error);
      setError('Failed to fetch spending data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const accessToken = session?.accessToken;
      if (!accessToken) {
        throw new Error("No access token available; reauthenticate");
      }
      // Call the refresh API via POST and include access_token in query.
      const response = await axios.post(
        `${API_BASE_URL}/refresh?access_token=${encodeURIComponent(accessToken)}`,
        {}, // no body needed
        { headers: { "Content-Type": "application/json" } }
      );
      if (response.data.success) {
        // Refresh the active tab data.
        if (activeTab === "all") {
          await fetchAllSpendingData();
        } else {
          await fetchTabData(activeTab);
        }
      }
    } catch (error) {
      console.error("Error refreshing data:", error);
      setError("Failed to refresh data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  
  

  const renderSpendingGraph = (data) => {
    if (!data || !data.details || data.details.length === 0) return null;

    const chartData = {
      labels: data.details.map((t) => t.date),
      datasets: [
        {
          label: 'Spending',
          data: data.details.map((t) => t.amount),
          borderColor: '#000000',
          tension: 0.4,
          pointRadius: 0,
          borderWidth: 2,
        },
      ],
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 12,
          titleColor: '#fff',
          bodyColor: '#fff',
          displayColors: false,
          callbacks: {
            label: (context) => `₹${context.parsed.y.toFixed(2)}`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { display: false },
        },
        y: {
          grid: { color: 'rgba(0, 0, 0, 0.05)' },
          ticks: {
            callback: (value) => `₹${value}`,
          },
        },
      },
    };

    return (
      <div className="h-48 mt-8">
        <Line data={chartData} options={options} />
      </div>
    );
  };

  const renderSpendingSummary = (period, data) => {
    if (!data) return null;
    const labels = {
      daily: ['Daily Spending', 'today', 'Yesterday'],
      weekly: ['Weekly Spending', 'this week', 'Last Week'],
      monthly: ['Monthly Spending', 'this month', 'Last Month'],
    };

    const prevSpending = data.summary.previously; // previous period total
    const currSpending = data.summary.total; // current period total
    let displayChange = "";
    let arrowDisplay = "";

    // Check if previous spending is zero.
    if (prevSpending === 0) {
      if (currSpending > 0) {
        displayChange = "New";
        arrowDisplay = "↑";
      } else {
        displayChange = "0.00%";
        arrowDisplay = "";
      }
    } else {
      const changePercentage = ((currSpending - prevSpending) / prevSpending) * 100;
      arrowDisplay = changePercentage > 0 ? "↑" : "↓";
      displayChange = `${Math.abs(changePercentage).toFixed(2)}%`;
    }
    return (
      <div className="flex flex-col items-center text-center">
        <h2 className="text-2xl font-semibold mb-1">{labels[period][0]}</h2>
        <div className="text-gray-500 text-sm mb-6">{labels[period][1]}</div>
        <div className="text-6xl font-bold mb-6">₹{currSpending.toFixed(2)}</div>
        <div className="flex items-center space-x-2">
          <span className="text-gray-500">
            {labels[period][2]} ₹{prevSpending.toFixed(2)}
          </span>
          <span className={arrowDisplay === "↑" ? 'text-red-500' : 'text-green-500'}>
            {arrowDisplay} {displayChange}
          </span>
        </div>
        {(period === 'weekly' || period === 'monthly') && activeTab !== 'all' && renderSpendingGraph(data)}
      </div>
    );
  };

  // Handle various session states
  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  if (!session) {
    return (
      <div className="min-h-screen bg-[#f9f9f9] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-md px-8 py-12 max-w-md w-full text-center">
          <h1 className="text-3xl font-bold mb-2">Welcome to finmon</h1>
          <p className="text-gray-600 mb-8">Your Spending, Simplified</p>
  
          <div className="border border-gray-200 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold mb-1">Sign in to your account</h2>
            <p className="text-sm text-gray-500 mb-4">Use your Google account to continue</p>
            <button
              onClick={() => signIn('google')}
              className="flex items-center justify-center space-x-3 w-full py-3 bg-black text-white rounded-lg hover:bg-gray-900 transition"
            >
              {/* <Image src={googleIcon} alt="Google" width={20} height={20} /> */}
              <span>Sign in with Google</span>
            </button>
          </div>
  
          <p className="text-xs text-gray-500">
            By signing in, you agree to our <span className="font-semibold text-black">Terms & Conditions</span>.
          </p>
        </div>
      </div>
    );
  }
  if (!session.accessToken) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <p className="mb-4">No access token available. Please logout and sign in again.</p>
        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Logout and Sign in
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-lg mx-auto px-4 py-8 relative">
        {/* Top Navbar */}
        <div className="flex justify-between items-center mb-12">
          <h1 className="text-2xl font-bold">finmon</h1>

          <div className="flex space-x-4">
            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="p-2 rounded-full hover:bg-gray-100"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>

            {/* Profile Button (relative container for the popover) */}
            <div className="relative inline-block">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="p-2 rounded-full hover:bg-gray-100"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white border shadow-lg rounded z-50">
                  {/* User Name */}
                  <div className="p-4 border-b">
                    <h2 className="text-xl font-bold">
                      {session.user?.name || 'User'}
                    </h2>
                  </div>
                  {/* Future features */}
                  {/* <div className="p-4 flex flex-col gap-2">
                    <p className="text-gray-600">Profile Settings</p>
                    <p className="text-gray-600">Preferences</p>
                    <p className="text-gray-600">Account Details</p>
                  </div> */}
                  {/* Logout */}
                  <div className="p-4 border-t">
                    <button
                      onClick={() => {
                        setIsProfileOpen(false);
                        signOut({ callbackUrl: '/' });
                      }}
                      className="w-full bg-black hover:bg-red-700 text-white py-2 rounded"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* If an error is set, display it */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        {/* Main Content */}
        {isLoading ? (
        <div className="flex flex-col justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="text-gray-500 mt-4 max-w-sm text-center">
            {loadingMsg}
          </p>
        </div>
      ) : (
          <div className="space-y-8">
            <div className="flex-1 flex flex-col justify-center min-h-[400px]">
              {activeTab === 'all' ? (
                <>
                  {renderSpendingSummary('daily', spendingData.daily)}
                  {renderSpendingSummary('weekly', spendingData.weekly)}
                  {renderSpendingSummary('monthly', spendingData.monthly)}
                </>
              ) : (
                renderSpendingSummary(activeTab, spendingData[activeTab])
              )}
            </div>

            <div className="fixed bottom-8 left-0 right-0">
              <div className="max-w-lg mx-auto px-4">
                <div className="bg-black text-white rounded-full p-2 flex justify-between">
                  <button
                    onClick={() => setActiveTab('daily')}
                    className={`px-4 py-2 rounded-full ${
                      activeTab === 'daily' ? 'text-blue-400' : ''
                    }`}
                  >
                    daily
                  </button>
                  <button
                    onClick={() => setActiveTab('weekly')}
                    className={`px-4 py-2 rounded-full ${
                      activeTab === 'weekly' ? 'text-blue-400' : ''
                    }`}
                  >
                    weekly
                  </button>
                  <button
                    onClick={() => setActiveTab('monthly')}
                    className={`px-4 py-2 rounded-full ${
                      activeTab === 'monthly' ? 'text-blue-400' : ''
                    }`}
                  >
                    monthly
                  </button>
                  <button
                    onClick={() => setActiveTab('all')}
                    className={`px-4 py-2 rounded-full ${
                      activeTab === 'all' ? 'text-blue-400' : ''
                    }`}
                  >
                    all
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
