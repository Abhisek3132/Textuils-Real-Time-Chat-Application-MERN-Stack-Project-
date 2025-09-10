import Avatar from '../../Assets/Avatar.jpg';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { io } from 'socket.io-client';
import './Dashboard.css';
import moment from 'moment';
import Picker from 'emoji-picker-react';


const Dashboard = () => {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user:detail')));
  const [conversations, setConversations] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('conversations')) || [];
    } catch (e) {
      console.error("Error parsing conversations from localStorage", e);
      return [];
    }
  });
  const [messages, setMessages] = useState({});
  const [message, setMessage] = useState('');
  const [users, setUsers] = useState([]);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'day');
  const [socket, setSocket] = useState(null);
  const chatContainerRef = useRef(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('unreadMessages')) || {};
    } catch (e) {
      console.error("Error parsing unreadMessages from localStorage", e);
      return {};
    }
  });
  const [activeUsers, setActiveUsers] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [contactsSearchQuery, setContactsSearchQuery] = useState(''); // State for search query in Contacts
  const [filteredUsers, setFilteredUsers] = useState([]);// State for filtered users in Contacts
  const [searchQuery, setSearchQuery] = useState(''); // State for search query
  const [filteredConversations, setFilteredConversations] = useState([]);// State for filtered conversations
  const [selectedEmojis, setSelectedEmojis] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);


  const recvId = messages?.receiver?.receiverId;
  const isOnline = recvId && activeUsers.includes(String(recvId));


  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => (t === 'day' ? 'night' : 'day'));

  const unifiedToNative = (unified) => {
    try {
      return unified.split('-').map(u => '0x' + u).map(cp => String.fromCodePoint(cp)).join('');
    } catch {
      return '';
    }
  };

  const onEmojiClick = (emojiData, event) => {
    const native = emojiData?.emoji || emojiData?.native || (emojiData?.unified ? unifiedToNative(emojiData.unified) : undefined);
    if (native) {
      setMessage(prev => prev + native);
      setSelectedEmojis(prev => [...prev, native]);
    } else {
      // fallback: ignore or log for debugging
      console.warn('Unknown emoji payload', emojiData);
    }
  };

  const toggleEmojiPicker = () => {
    setShowEmojiPicker(!showEmojiPicker);
  };

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages?.messages]);

  useEffect(() => {
    const newSocket = io('http://localhost:8080');
    setSocket(newSocket);
    return () => {
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket?.emit('addUser', user?.id);

    socket?.on('getUsers', (users) => {
      console.log('activeUsers:>>', users);
      setActiveUsers(users);
    });

    socket?.on('getMessage', (data) => {
      console.log('Received message:', data);
      if (messages?.receiver?.receiverId === data.user.id || data.user.id === user?.id) {
        setMessages(prev => {
          const newMessages = prev.messages ? [...prev.messages, data] : [data];
          return {
            ...prev,
            messages: newMessages
          };
        });
      }

      // setUnreadMessages(prev => ({
      //   ...prev,
      //   [data.user.id]: (prev[data.user.id] || 0) + 1
      // }));

      // Update conversations to move the latest message to the top
      setConversations(prevConversations => {
        const updatedConversations = prevConversations.map(conversation => {
          if (conversation.user.receiverId === data.user.id) {
            return { ...conversation, lastMessage: data };
          }
          return conversation;
        });

        // Move the updated conversation to the top 
        updatedConversations.sort((a, b) => {
          if (a.user.receiverId === data.user.id) return -1;
          if (b.user.receiverId === data.user.id) return 1;
          return 0;
        });

        return [...updatedConversations];
      });
    });

  }, [socket, user?.id]);

  useEffect(() => {
    const loggedinUser = JSON.parse(localStorage.getItem('user:detail'));
    const fetchConversations = async () => {
      const res = await fetch(`http://localhost:8000/api/conversation/${loggedinUser?.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const resData = await res.json();
      setConversations(resData);
    };
    fetchConversations();
  }, []);

  useEffect(() => {
    const fetchUsers = async () => {
      const res = await fetch(`http://localhost:8000/api/users/${user?.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const resData = await res.json();
      setUsers(resData);
    };
    fetchUsers();
  }, [user?.id]);

  const fetchMessages = useCallback(async (conversationId, receiver) => {
    const res = await fetch(`http://localhost:8000/api/message/${conversationId}?senderId=${user?.id}&&receiverId=${receiver?.receiverId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const resData = await res.json();
    console.log('Messages:', resData);
    setMessages(prev => ({ ...prev, messages: resData, receiver, conversationId }));
    setUnreadMessages(prev => ({ ...prev, [receiver.receiverId]: 0 }));
    setSelectedConversationId(conversationId);
  }, [user?.id]);

  useEffect(() => {
    // After conversations are updated, sort them
    setConversations(prevConversations => {
      const sorted = [...prevConversations].sort((a, b) => {
        // Check if a or b has a new message
        const aHasNewMessage = unreadMessages[a.user.receiverId] > 0;
        const bHasNewMessage = unreadMessages[b.user.receiverId] > 0;

        if (aHasNewMessage && !bHasNewMessage) {
          return -1; // a comes before b
        }
        if (!aHasNewMessage && bHasNewMessage) {
          return 1; // b comes before a
        }

        // If neither has a new message, maintain the existing order
        return 0;
      });
      localStorage.setItem('conversations', JSON.stringify(sorted));
      return sorted;
    });
  }, [unreadMessages]);

  const sendMessage = async () => {
    const timestamp = new Date().toISOString();
    const messageData = {
      message: message,
      user: { id: user?.id },
      timestamp: timestamp
    };

    socket?.emit('sendMessage', {
      senderId: user?.id,
      receiverId: messages?.receiver?.receiverId,
      message,
      conversationId: messages?.conversationId,
      timestamp
    });

    await fetch('http://localhost:8000/api/message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conversationId: messages?.conversationId,
        senderId: user?.id,
        message,
        receiverId: messages?.receiver?.receiverId,
        createdAt: timestamp
      }),
    });
    setMessage('');
    setSelectedEmojis([]);
  };

  // ...existing code...
  const memoizedMessages = useMemo(() => {
    if (!messages?.receiver?.username) {
      return (
        <div className='text-center text-lg font-semibold text-gray-700 mt-24 animate-fade-in-up'>
          Welcome aboard! Get ready for some fun conversations!
          <div className='is-typing, inline-flex ml-5'>
            <div class='jump1'></div>
            <div class='jump2'></div>
            <div class='jump3'></div>
            <div class='jump4'></div>
            <div class='jump5'></div>
          </div>
        </div>
      );
    }

    if (!messages?.messages || messages?.messages.length === 0) {
      return (
        <div className='text-center text-lg font-semibold text-gray-500 mt-24'>
          Let's Chat together!
        </div>
      );
    }

    // group messages by date header (Today / Yesterday / MMM D, YYYY)
    const sorted = [...messages.messages].sort((a, b) => {
      const ta = new Date(a.timestamp || a.createdAt).getTime();
      const tb = new Date(b.timestamp || b.createdAt).getTime();
      return ta - tb;
    });

    const nodes = [];
    let lastHeader = null;

    sorted.forEach(({ message: msgText, user: { id } = {}, createdAt, timestamp }, index) => {
      const ts = timestamp || createdAt;
      const m = moment(ts);
      let header;
      if (m.isSame(moment(), 'day')) header = 'Today';
      else if (m.isSame(moment().subtract(1, 'day'), 'day')) header = 'Yesterday';
      else header = m.format('MMMM D, YYYY');

      if (header !== lastHeader) {
        nodes.push(
          <div key={`hdr-${header}-${index}`} className="text-center text-xs text-gray-500 my-4">
            {header}
          </div>
        );
        lastHeader = header;
      }

      const key = `${index}-${ts}`;
      nodes.push(
        <div
          key={key}
          className={`max-w-[40%] rounded-b-xl p-4 mb-6 ${id === user?.id
            ? ' bg-[#245ac6] text-white rounded-tl-xl ml-auto'
            : ' bg-[#e9edf5] rounded-tr-xl'
            }`}
        >
          {msgText}
          <div className={`text-xs ${id === user?.id ? 'text-gray-300' : 'text-gray-700'} mt-1`}>
            {moment(ts).format('LT')}
          </div>
        </div>
      );
    });

    return nodes;
  }, [messages?.messages, messages?.receiver?.username, user?.id]);

  const sortedConversations = useMemo(() => {
    return [...conversations].sort((a, b) => {
      const userA = a.user.receiverId;
      const userB = b.user.receiverId;
      const hasUnreadA = unreadMessages[userA] > 0;
      const hasUnreadB = unreadMessages[userB] > 0;

      if (hasUnreadA && !hasUnreadB) {
        return -1; // a comes before b
      } else if (!hasUnreadA && hasUnreadB) {
        return 1; // b comes before a
      } else {
        return 0; // no change in order
      }
    });
  }, [conversations, unreadMessages]);

  useEffect(() => {
    localStorage.setItem('conversations', JSON.stringify(conversations));
  }, [conversations]);

  useEffect(() => {
    localStorage.setItem('unreadMessages', JSON.stringify(unreadMessages));
  }, [unreadMessages]);

  useEffect(() => {
    // Filter conversations based on search query
    if (searchQuery) {
      const filtered = conversations.filter(conversation =>
        conversation.user.username.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredConversations(filtered);
    } else {
      setFilteredConversations(conversations);
    }
  }, [searchQuery, conversations]);

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };

  useEffect(() => {
    // Filter users based on search query
    if (contactsSearchQuery) {
      const filtered = users.filter(user =>
        user.user.username.toLowerCase().includes(contactsSearchQuery.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [contactsSearchQuery, users]);

  const handleContactsSearch = (e) => {
    setContactsSearchQuery(e.target.value);
  };

  return (
    <div className="flex app-container w-full h-full ">
      <button
        type="button"
        onClick={toggleTheme}
        className="theme-toggle fixed top-4 right-4 z-50 p-2 rounded-md shadow-sm bg-white/80 hover:bg-white/90"
        aria-label="Toggle theme"
      >
        {theme === 'day' ? '🌙' : '☀️'}
      </button>
      <div className="bg-gradient-to-r from-[#c7e2e7] via-[#b2d5de] to-[#85cad0] w-[20%] h-screen shadow-lg flex flex-col justify-start border-r border-gray-300">
        <div className='flex justify-center items-center my-4'>
          <h1 className='text-2xl font-bold text-blue-700 slide-in-left'>TextuilS💬</h1>
        </div>
        <div className='flex justify-start ml-7 items-center my-8'>
          <div className='flex border border-blue-500 p-[2px] rounded-full'><img src={Avatar} width={55} height={55} alt='logo' className='flex rounded-full' /></div>
          <div className='flex flex-col justify-center ml-5'>
            <h3 className='text-[20px]'>{user?.username}</h3>
            <div className='relative'>
              <p
                className='text-[15px] font-light cursor-pointer hover:bg-blue-100'
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                My Account
              </p>
              {isDropdownOpen && (
                <div className='absolute top-6 right-0 bg-white shadow-md rounded-md w-32 z-10'>
                  <button
                    className='block w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100'
                    onClick={() => {
                      localStorage.removeItem('user:token');
                      localStorage.removeItem('user:detail');
                      window.location.href = '/users/sign_in';
                    }}
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        <hr />

        <div className='mx-14 mt-10 overflow-scroll hide-scrollbar'>
          <input
            type="text"
            placeholder="Search Messages"
            value={searchQuery}
            onChange={handleSearch}
            className="w-full py-2 px-4 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
          />
          <h3 className='text-[17px] font-semibold text-blue-700'>Messages</h3>
          <div>
            {
              (searchQuery ? filteredConversations : sortedConversations).length > 0 ?
                (searchQuery ? filteredConversations : sortedConversations).map(({ conversationId, user }) => {
                  const hasUnread = unreadMessages[user.receiverId] > 0;
                  const isCurrentUserReceiver = messages?.receiver?.receiverId === user.receiverId;
                  return (
                    <div
                      key={conversationId}
                      className='flex items-center py-5 hover:bg-blue-100 border-b  border-b-gray-200 '
                    >
                      <div className='flex items-center cursor-pointer' onClick={() => fetchMessages(conversationId, user)}>
                        <div className="relative">
                          <img src={Avatar} className='w-[50px] h-[50px] rounded-full p-[2px] border border-blue-700 ' />
                          {hasUnread && !isCurrentUserReceiver && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full text-xs px-2 py-1 z-20">
                              {unreadMessages[user.receiverId]}
                            </span>
                          )}
                        </div>
                        <div className='ml-5'>
                          <h3 className='text-sm font-semibold'>{user?.username}</h3>
                          <p className='text-xs text-gray-500'>{user?.email}</p>
                        </div>
                      </div>
                    </div>
                  );
                }) : <div className='text-center text-lg font-semibold text-gray-500 mt-24'>No conversations found</div>
            }
          </div>
        </div>
      </div>
      <div className="bg-white w-[60%] h-screen shadow-lg flex flex-col justify-start items-center hide-scrollbar border-r border-gray-100" style={{
        backgroundImage: `url(${require('../../Assets/41919.jpg')})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        backgroundBlendMode: 'lighten',
        backdropFilter: 'blur(25px)',

      }}>
        {
          messages?.receiver?.username &&
          <div className='w-[75%] h-[60px] bg-[#e9edf5] shadow-md mt-8 mb-8 rounded-full flex items-center px-14 py-2  bg-white/25 backdrop-blur-sm border border-white/60 shadow-2xl'>
            <div className='flex items-center w-full justify-between'>
              <div className='flex items-center'>
                <img src={Avatar} width={45} height={45} alt='logo' className='rounded-full' />
                <div className='ml-5'>
                  <h3 className='text-[15px] font-semibold'>{messages?.receiver?.username}</h3>
                  <p className='text-[12px] font-light flex items-center gap-2'>
                    <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                    online
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button className="hover:text-blue-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 19h8a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </button>
                <button className="hover:text-green-600">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-phone-outgoing">
                    <path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M5 4h4l2 5l-2.5 1.5a11 11 0 0 0 5 5l1.5 -2.5l5 2v4a2 2 0 0 1 -2 2c-8.072 -.49 -14.51 -6.928 -15 -15a2 2 0 0 1 2 -2" /><path d="M15 5h6" /><path d="M18.5 7.5l2.5 -2.5l-2.5 -2.5" />
                  </svg>
                </button>
                <button className="hover:text-gray-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <circle cx="4" cy="10" r="2" />
                    <circle cx="10" cy="10" r="2" />
                    <circle cx="16" cy="10" r="2" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        }
        <div
          className='flex-1 h-full w-full overflow-scroll border-b hide-scrollbar'
          ref={chatContainerRef}
        >
          <div className='px-10 py-14 relative'>
            {memoizedMessages}
          </div>
        </div>
        {
          messages?.receiver?.username &&

          <div className='p-10 w-full flex justify-start'>
            <div className={`flex w-full h-full items-center relative`}>
              <button
                className="hover:text-gray-500 absolute left-3 top-1/2 transform -translate-y-1/2"
                onClick={toggleEmojiPicker}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-6 h-6 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </button>
              {showEmojiPicker && (
                <div className="absolute bottom-16 left-3 z-10">
                  <Picker onEmojiClick={onEmojiClick} />
                  <div>
                    Selected Emojis: {selectedEmojis.map((emoji, index) => (
                      <span key={index}>{emoji}</span>
                    ))}
                  </div>
                </div>
              )}
              <button className='hover:text-gray-500 absolute left-3 top-1/2 transform -translate-y-1/2 ml-8'>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-files">
                  <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                  <path d="M15 3v4a1 1 0 0 0 1 1h4" />
                  <path d="M18 17h-7a2 2 0 0 1 -2 -2v-10a2 2 0 0 1 2 -2h4l5 5v7a2 2 0 0 1 -2 2z" />
                  <path d="M16 17v2a2 2 0 0 1 -2 2h-7a2 2 0 0 1 -2 -2v-10a2 2 0 0 1 2 -2h2" />
                </svg>
              </button>

              <input
                type="text"
                placeholder='Type your message here...'
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className={`w-[90%] scroll-px-12 py-2 rounded-full border shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 ml pl-20`}
              />

              <button className='ml-auto px-4 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors ' onClick={sendMessage}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-send-2">
                  <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                  <path d="M4.698 4.034l16.302 7.966l-16.302 7.966a.503 .503 0 0 1 -.546 -.124a.555 .555 0 0 1 -.12 -.568l2.468 -7.274l-2.468 -7.274a.555 .555 0 0 1 .12 -.568a.503 .503 0 0 1 .546 -.124z" />
                  <path d="M6.5 12h14.5" />
                </svg>
              </button>
            </div>
          </div>
        }
      </div>
      <div className='w-[20%] h-screen overflow-scroll shadow-lg px-8 py-16 bg-gradient-to-r from-[#8bcad5] via-[#b2d5de] to-[#c5dadc]'>
        <input
          type="text"
          placeholder="Search Contacts"
          value={contactsSearchQuery}
          onChange={handleContactsSearch}
          className="w-full py-2 px-4 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
        />
        <div className='text-[17px] font-semibold text-blue-700'>Contacts</div>
        {
          (contactsSearchQuery ? filteredUsers : users).length > 0 ?
            (contactsSearchQuery ? filteredUsers : users).map(({ userId, user }) => {
              const hasUnread = unreadMessages[user.receiverId] > 0;
              const isCurrentUserReceiver = messages?.receiver?.receiverId === user.receiverId;
              return (
                <div
                  key={userId}
                  className='flex items-center py-5 hover:bg-blue-100 border-b  border-b-gray-200 '
                >
                  <div className='flex items-center cursor-pointer' onClick={() => fetchMessages('new', user)}>
                    <div className="relative">
                      <img src={Avatar} className='w-[50px] h-[50px] rounded-full p-[2px] border border-blue-700 ' />
                      {hasUnread && !isCurrentUserReceiver && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full text-xs px-2 py-1 z-20">
                          {unreadMessages[user.receiverId]}
                        </span>
                      )}
                    </div>
                    <div className='ml-5'>
                      <h3 className='text-sm font-semibold'>{user?.username}</h3>
                      <p className='text-xs text-gray-500'>{user?.email}</p>
                    </div>
                  </div>
                </div>
              );
            }) : <div className='text-center text-lg font-semibold text-gray-500 mt-24'>No conversations found</div>
        }
      </div>
    </div>
  );
};

export default Dashboard;