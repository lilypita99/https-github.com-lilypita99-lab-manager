import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5003';

function roleLabel(role) {
  return role === 'manager' ? 'Manager' : 'Lab User';
}

function sectionCardStyle(background = '#ffffff') {
  return {
    border: '1px solid #dce8f2',
    borderRadius: 14,
    padding: 14,
    background,
  };
}

export default function GroupHub({ authToken, currentUser, onUserUpdated, onNavigatePage, fullPageTab }) {
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [myInvites, setMyInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [statusFading, setStatusFading] = useState(false);
  const [error, setError] = useState('');
  const [errorFading, setErrorFading] = useState(false);
  const statusFadeTimerRef = useRef(null);
  const statusClearTimerRef = useRef(null);
  const errorFadeTimerRef = useRef(null);
  const errorClearTimerRef = useRef(null);

  const showStatus = (msg) => {
    clearTimeout(statusFadeTimerRef.current);
    clearTimeout(statusClearTimerRef.current);
    setStatusFading(false);
    setStatus(msg);
    statusFadeTimerRef.current = setTimeout(() => setStatusFading(true), 3000);
    statusClearTimerRef.current = setTimeout(() => setStatus(''), 3800);
  };

  const showError = (msg) => {
    clearTimeout(errorFadeTimerRef.current);
    clearTimeout(errorClearTimerRef.current);
    setErrorFading(false);
    setError(msg);
    errorFadeTimerRef.current = setTimeout(() => setErrorFading(true), 4000);
    errorClearTimerRef.current = setTimeout(() => setError(''), 4800);
  };

  const [groupForm, setGroupForm] = useState({
    lab_name: '',
    group_name: '',
  });
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'lab',
  });
  const [activePanel, setActivePanel] = useState(currentUser.role === 'manager' ? 'overview' : 'membership');

  const authHeaders = useMemo(
    () => ({ Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' }),
    [authToken]
  );

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [groupRes, membersRes, invitesRes, myInvitesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/group`, { headers: authHeaders }),
        fetch(`${API_BASE_URL}/api/group/members`, { headers: authHeaders }),
        fetch(`${API_BASE_URL}/api/group/invites`, { headers: authHeaders }),
        fetch(`${API_BASE_URL}/api/my-invites`, { headers: authHeaders }),
      ]);

      const groupData = groupRes.ok ? await groupRes.json() : { group: null };
      const membersData = membersRes.ok ? await membersRes.json() : { members: [] };
      const invitesData = invitesRes.ok ? await invitesRes.json() : { invites: [] };
      const myInvitesData = myInvitesRes.ok ? await myInvitesRes.json() : { invites: [] };

      const loadedGroup = groupData.group || null;
      setGroup(loadedGroup);
      setMembers(Array.isArray(membersData.members) ? membersData.members : []);
      setInvites(Array.isArray(invitesData.invites) ? invitesData.invites : []);
      setMyInvites(Array.isArray(myInvitesData.invites) ? myInvitesData.invites : []);

      if (loadedGroup) {
        setGroupForm({
          lab_name: loadedGroup.lab_name || '',
          group_name: loadedGroup.group_name || '',
        });
      }
    } catch {
      showError('Could not load group data right now.');
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => () => {
    clearTimeout(statusFadeTimerRef.current);
    clearTimeout(statusClearTimerRef.current);
    clearTimeout(errorFadeTimerRef.current);
    clearTimeout(errorClearTimerRef.current);
  }, []);

  useEffect(() => {
    setActivePanel(currentUser.role === 'manager' ? 'overview' : 'membership');
  }, [currentUser.role]);

  const saveGroup = async (e) => {
    e.preventDefault();
    setStatus('');
    setError('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/group`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(groupForm),
      });
      const data = await res.json();
      if (!res.ok) {
        showError(data.error || 'Could not save group details.');
        return;
      }

      setGroup(data.group || null);
      if (data.user && onUserUpdated) {
        onUserUpdated(data.user);
      }
      showStatus('Group details saved.');
      loadAll();
    } catch {
      showError('Could not save group details right now.');
    }
  };

  const sendInvite = async (e) => {
    e.preventDefault();
    setStatus('');
    setError('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/group/invite`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(inviteForm),
      });
      const data = await res.json();
      if (!res.ok) {
        showError(data.error || 'Could not send invite.');
        return;
      }

      setInviteForm({ email: '', role: 'lab' });
      if (data.email_sent) {
        showStatus(`Invite sent to ${data.invite?.email || 'member'}.`);
      } else {
        showStatus('Invite saved.');
      }
      loadAll();
    } catch {
      showError('Could not send invite right now.');
    }
  };

  const respondToInvite = async (inviteId, action) => {
    setStatus('');
    setError('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/my-invites/${inviteId}/${action}`, {
        method: 'POST',
        headers: authHeaders,
      });
      const data = await res.json();
      if (!res.ok) {
        showError(data.error || `Could not ${action} invite.`);
        return;
      }

      if (action === 'accept') {
        if (data.user && onUserUpdated) {
          onUserUpdated(data.user);
        }
        showStatus(`You joined ${data.group?.group_name || 'the group'}.`);
      } else {
        showStatus('Invite declined.');
      }
      loadAll();
    } catch {
      showError(`Could not ${action} invite right now.`);
    }
  };

  const removeMember = async (memberId) => {
    setStatus('');
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/group/members/${memberId}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      const data = await res.json();
      if (!res.ok) {
        showError(data.error || 'Could not remove member.');
        return;
      }
      showStatus('Member removed from group.');
      loadAll();
    } catch {
      showError('Could not remove member right now.');
    }
  };

  const isManager = currentUser.role === 'manager';

  const sideTabStyle = (tabId) => {
    const isActive = fullPageTab ? fullPageTab === tabId : activePanel === tabId;
    return {
      width: '100%',
      textAlign: 'left',
      padding: '10px 12px',
      borderRadius: 10,
      border: isActive ? '1px solid #8bc8eb' : '1px solid #dce8f2',
      background: isActive ? '#eef8ff' : '#ffffff',
      color: isActive ? '#0f3b57' : '#406178',
      fontSize: 13,
      fontWeight: 700,
      cursor: 'pointer',
    };
  };

  const renderPendingInviteActions = () => {
    if (myInvites.length === 0) {
      return null;
    }

    return (
      <div style={{ marginBottom: 16, padding: 14, borderRadius: 14, background: '#f0f9ff', border: '1px solid #bae6fd' }}>
        <h3 style={{ margin: '0 0 8px', color: '#0f3b57', fontSize: 16 }}>Pending Invites</h3>
        <div style={{ display: 'grid', gap: 10 }}>
          {myInvites.map((invite) => (
            <div
              key={invite.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
                padding: '10px 12px',
                borderRadius: 10,
                background: '#ffffff',
                border: '1px solid #dbeafe',
              }}
            >
              <div>
                <div style={{ color: '#163852', fontWeight: 700 }}>
                  {invite.group?.group_name || 'Lab Group'}
                </div>
                <div style={{ color: '#406178', fontSize: 14 }}>
                  {invite.group?.lab_name || 'Unknown lab'}
                  <span style={{ marginLeft: 8 }}>{roleLabel(invite.role)}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => respondToInvite(invite.id, 'accept')}
                  style={{ padding: '8px 12px' }}
                >
                  Accept
                </button>
                <button
                  type="button"
                  onClick={() => respondToInvite(invite.id, 'decline')}
                  style={{
                    padding: '8px 12px',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: '#475569',
                  }}
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderMembersList = (allowRemoval) => (
    <div style={sectionCardStyle()}>
      <h3 style={{ margin: '0 0 8px', color: '#163852', fontSize: 16 }}>
        {allowRemoval ? 'Team Members' : 'Your Team'}
      </h3>
      {members.length === 0 ? (
        <p style={{ margin: 0, color: '#5a7488', fontSize: 14 }}>No members yet.</p>
      ) : (
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {members.map((member) => (
            <li key={member.id} style={{ marginBottom: 8, color: '#163852', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>{member.display_name || member.email}</span>
              <span style={{ color: '#5a7488', fontSize: 13 }}>
                {roleLabel(member.role)}
              </span>
              {allowRemoval && member.id !== currentUser.id && (
                <button
                  type="button"
                  onClick={() => removeMember(member.id)}
                  style={{ marginLeft: 'auto', fontSize: 12, color: '#c0392b', background: 'none', border: '1px solid #c0392b', borderRadius: 4, padding: '1px 7px', cursor: 'pointer' }}
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  const renderOutgoingInvites = () => (
    <div style={sectionCardStyle()}>
      <h3 style={{ margin: '0 0 8px', color: '#163852', fontSize: 16 }}>Pending Outgoing Invites</h3>
      {invites.length === 0 ? (
        <p style={{ margin: 0, color: '#5a7488', fontSize: 14 }}>No pending invites.</p>
      ) : (
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {invites.map((invite) => (
            <li key={invite.id} style={{ marginBottom: 6, color: '#163852' }}>
              {invite.email}
              <span style={{ color: '#5a7488', marginLeft: 8, fontSize: 13 }}>
                {roleLabel(invite.role)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  const renderManagerOverview = () => (
    <>
      <div style={{ marginBottom: 14, padding: '14px 16px', borderRadius: 14, background: 'linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%)', border: '1px solid #c7d8ee' }}>
        <div style={{ fontSize: 12, color: '#58748a', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>
          Manager Workspace
        </div>
        <h3 style={{ margin: '0 0 4px', color: '#11324d', fontSize: 22 }}>Run your lab team from one place</h3>
        <p style={{ margin: 0, color: '#496579', fontSize: 14 }}>
          Create the group, invite people in, and manage who stays on the roster.
        </p>
      </div>

      {renderPendingInviteActions()}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1.2fr) minmax(220px, 0.8fr)', gap: 14, marginBottom: 14 }}>
        <form onSubmit={saveGroup} style={{ ...sectionCardStyle('#ffffff'), display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <h3 style={{ margin: '0 0 4px', color: '#163852', fontSize: 16 }}>{group ? 'Edit Group Details' : 'Create Your Group'}</h3>
            <p style={{ margin: 0, color: '#5a7488', fontSize: 14 }}>These names are what invited users will see.</p>
          </div>
          <div>
            <label style={{ marginBottom: 4 }}>Lab Name</label>
            <input
              value={groupForm.lab_name}
              onChange={(e) => setGroupForm((prev) => ({ ...prev, lab_name: e.target.value }))}
              placeholder="Pita Lab"
              required
            />
          </div>
          <div>
            <label style={{ marginBottom: 4 }}>University</label>
            <input
              value={groupForm.group_name}
              onChange={(e) => setGroupForm((prev) => ({ ...prev, group_name: e.target.value }))}
              placeholder="State University"
              required
            />
          </div>
          <div style={{ alignSelf: 'end' }}>
            <button type="submit" style={{ width: '100%' }}>
              {group ? 'Save Changes' : 'Create Group'}
            </button>
          </div>
        </form>

        <div style={sectionCardStyle('#f7fbff')}>
          <div style={{ fontSize: 13, color: '#58748a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>University</div>
          {group ? (
            <>
              <div style={{ marginTop: 6, fontSize: 18, fontWeight: 700, color: '#163852' }}>{group.lab_name}</div>
              <div style={{ marginTop: 2, fontSize: 14, color: '#2f5d79' }}>{group.group_name}</div>
            </>
          ) : (
            <div style={{ marginTop: 8, color: '#9a3412', fontSize: 14 }}>
              Set your Lab Name and University to create your team.
            </div>
          )}
        </div>
      </div>

      {group && (
        <form
          onSubmit={sendInvite}
          style={{
            ...sectionCardStyle('#ffffff'),
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 10,
          }}
        >
          <div style={{ gridColumn: '1 / -1' }}>
            <h3 style={{ margin: '0 0 4px', color: '#163852', fontSize: 16 }}>Invite Someone</h3>
            <p style={{ margin: 0, color: '#5a7488', fontSize: 14 }}>Add another manager or bring in a lab member.</p>
          </div>
          <div>
            <label style={{ marginBottom: 4 }}>Invite by Email</label>
            <input
              type="email"
              value={inviteForm.email}
              onChange={(e) => setInviteForm((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="teammate@lab.edu"
              required
            />
          </div>
          <div>
            <label style={{ marginBottom: 4 }}>Role</label>
            <select value={inviteForm.role} onChange={(e) => setInviteForm((prev) => ({ ...prev, role: e.target.value }))}>
              <option value="lab">Lab User</option>
              <option value="manager">Manager</option>
            </select>
          </div>
          <div style={{ alignSelf: 'end' }}>
            <button type="submit" style={{ width: '100%' }}>Send Invite</button>
          </div>
        </form>
      )}
    </>
  );

  const renderMemberOverview = () => (
    <>
      <div style={{ marginBottom: 14, padding: '14px 16px', borderRadius: 14, background: 'linear-gradient(135deg, #fff7ed 0%, #fffaf5 100%)', border: '1px solid #fed7aa' }}>
        <div style={{ fontSize: 12, color: '#9a3412', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>
          Member Workspace
        </div>
        <h3 style={{ margin: '0 0 4px', color: '#7c2d12', fontSize: 22 }}>Your lab membership</h3>
        <p style={{ margin: 0, color: '#9a3412', fontSize: 14 }}>
          Review invitations, see your current team, and keep track of where you belong.
        </p>
      </div>

      {renderPendingInviteActions()}

      <div style={sectionCardStyle(group ? '#f8fafc' : '#fff7ed')}>
        <h3 style={{ margin: '0 0 8px', color: '#163852', fontSize: 16 }}>Current Membership</h3>
        {group ? (
          <>
            <div style={{ fontSize: 13, color: '#58748a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Lab</div>
            <div style={{ marginTop: 3, fontSize: 16, fontWeight: 700, color: '#163852' }}>{group.lab_name}</div>
            <div style={{ marginTop: 2, fontSize: 14, color: '#2f5d79' }}>{group.group_name}</div>
          </>
        ) : (
          <p style={{ margin: 0, color: '#9a3412', fontSize: 14 }}>
            You are not in a group yet. Ask a manager to invite your email.
          </p>
        )}
      </div>
    </>
  );

  const renderManagerDashboard = () => renderManagerOverview();

  const renderMemberDashboard = () => renderMemberOverview();

  const renderFullPageContent = () => {
    if (fullPageTab === 'lab-members') {
      return (
        <div style={{ display: 'grid', gap: 18 }}>
          {isManager ? renderManagerOverview() : renderMemberOverview()}
          {renderMembersList(isManager)}
          {isManager && renderOutgoingInvites()}
        </div>
      );
    }
    return null;
  };

  if (fullPageTab) {
    return (
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #dce8f2',
          borderRadius: 14,
          padding: 24,
          boxShadow: '0 8px 20px rgba(10, 30, 55, 0.08)',
        }}
      >
        <style>{`@keyframes lf-fadein{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}} @keyframes lf-fadeout{from{opacity:1}to{opacity:0}}`}</style>
        {error && (
          <div style={{ marginBottom: 10, color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 10px', animation: errorFading ? 'lf-fadeout 0.8s ease forwards' : 'lf-fadein 0.3s ease' }}>
            {error}
          </div>
        )}
        {status && (
          <div style={{ marginBottom: 10, color: '#065f46', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 8, padding: '8px 10px', animation: statusFading ? 'lf-fadeout 0.8s ease forwards' : 'lf-fadein 0.3s ease' }}>
            {status}
          </div>
        )}
        {loading ? <p style={{ margin: '8px 0', color: '#4b6478' }}>Loading...</p> : renderFullPageContent()}
      </div>
    );
  }

  return (
    <section
      style={{
        marginTop: 0,
        background: '#ffffff',
        border: '1px solid #dce8f2',
        borderRadius: 14,
        padding: 18,
        boxShadow: '0 8px 20px rgba(10, 30, 55, 0.08)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <h2 style={{ margin: 0, fontSize: 20, color: '#11324d' }}>Team & Lab</h2>
        <button
          type="button"
          onClick={loadAll}
          style={{
            padding: '7px 12px',
            background: '#eef6ff',
            border: '1px solid #cde1f3',
            borderRadius: 8,
            color: '#144a70',
          }}
        >
          Refresh
        </button>
      </div>

      <style>{`@keyframes lf-fadein{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}} @keyframes lf-fadeout{from{opacity:1}to{opacity:0}}`}</style>
      {error && (
        <div style={{ marginBottom: 10, color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 10px', animation: errorFading ? 'lf-fadeout 0.8s ease forwards' : 'lf-fadein 0.3s ease' }}>
          {error}
        </div>
      )}
      {status && (
        <div style={{ marginBottom: 10, color: '#065f46', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 8, padding: '8px 10px', animation: statusFading ? 'lf-fadeout 0.8s ease forwards' : 'lf-fadein 0.3s ease' }}>
          {status}
        </div>
      )}

      {loading ? (
        <p style={{ margin: '8px 0', color: '#4b6478' }}>Loading group info...</p>
      ) : (
        <>
          {isManager ? renderManagerDashboard() : renderMemberDashboard()}
        </>
      )}
    </section>
  );
}
