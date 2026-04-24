"use client";

import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type Team = { id: string; name: string; slug: string };

type UserInfo = {
  id: string;
  username: string;
  name: string | null;
};

type TokenContextValue = {
  token: string | null;
  setToken: (token: string) => void;
  clearToken: () => void;
  user: UserInfo | null;
  team: Team | null;
  setTeam: (team: Team | null) => void;
  teams: Team[];
  loaded: boolean;
};

const TokenContext = createContext<TokenContextValue | null>(null);

export function TokenProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [team, setTeamState] = useState<Team | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("vercel-pat");
    if (stored) setTokenState(stored);
    const storedTeam = localStorage.getItem("vercel-team");
    if (storedTeam) {
      try {
        setTeamState(JSON.parse(storedTeam) as Team);
      } catch {
        // ignore
      }
    }
    setLoaded(true);
  }, []);

  // load scopes when token changes
  useEffect(() => {
    if (!token) {
      setUser(null);
      setTeams([]);
      return;
    }

    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch("https://api.vercel.com/v2/user", { headers })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) =>
          d?.user
            ? ({
                id: d.user.id ?? d.user.uid ?? "",
                username: d.user.username,
                name: d.user.name ?? null,
              } satisfies UserInfo)
            : null,
        )
        .catch(() => null),

      fetch("https://api.vercel.com/v2/teams", { headers })
        .then((r) => (r.ok ? r.json() : { teams: [] }))
        .then((d) =>
          (d.teams ?? []).map((t: Record<string, string>) => ({
            id: t.id,
            name: t.name,
            slug: t.slug,
          })),
        )
        .catch(() => []),
    ]).then(([userInfo, teamsList]) => {
      setUser(userInfo as UserInfo | null);
      const validTeams = teamsList as Team[];
      setTeams(validTeams);

      // auto-select first team if nothing selected yet
      if (!team && validTeams.length > 0) {
        const first = validTeams[0];
        setTeamState(first);
        localStorage.setItem("vercel-team", JSON.stringify(first));
      }
    });
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const setToken = useCallback((t: string) => {
    localStorage.setItem("vercel-pat", t);
    setTokenState(t);
  }, []);

  const clearToken = useCallback(() => {
    localStorage.removeItem("vercel-pat");
    localStorage.removeItem("vercel-team");
    setTokenState(null);
    setTeamState(null);
    setUser(null);
    setTeams([]);
  }, []);

  const setTeam = useCallback((t: Team | null) => {
    if (t) localStorage.setItem("vercel-team", JSON.stringify(t));
    else localStorage.removeItem("vercel-team");
    setTeamState(t);
  }, []);

  if (!loaded) return null;

  return (
    <TokenContext
      value={{ token, setToken, clearToken, user, team, setTeam, teams, loaded }}
    >
      {children}
    </TokenContext>
  );
}

export function useToken() {
  const ctx = useContext(TokenContext);
  if (!ctx) throw new Error("useToken must be used within TokenProvider");
  return ctx;
}
