"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, Download, Database, BarChart3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ProblemsStats {
  total: number;
  byDifficulty: Record<string, number>;
  topTopics: { name: string; count: number }[];
}

export default function ProblemsImportPage() {
  const [isImporting, setIsImporting] = useState(false);
  const [stats, setStats] = useState<ProblemsStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [importResult, setImportResult] = useState<string>('');
  
  const { toast } = useToast();

  const startImport = async () => {
    setIsImporting(true);
    setImportResult('');
    
    try {
      const response = await fetch('/api/problems', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (data.success) {
        setImportResult(`✅ ${data.message}`);
        toast({
          title: "Import Successful",
          description: data.message,
        });
        
        // Refresh stats after import
        loadStats();
      } else {
        setImportResult(`❌ Import failed: ${data.error}`);
        toast({
          title: "Import Failed",
          description: data.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setImportResult(`❌ Import failed: ${errorMessage}`);
      toast({
        title: "Import Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const loadStats = async () => {
    setIsLoadingStats(true);
    
    try {
      const response = await fetch('/api/problems');
      const data = await response.json();
      
      if (data.success) {
        setStats(data.data);
      } else {
        toast({
          title: "Failed to Load Stats",
          description: data.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Failed to Load Stats",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
    } finally {
      setIsLoadingStats(false);
    }
  };

  React.useEffect(() => {
    loadStats();
  }, []);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'bg-green-100 text-green-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">LeetCode Problems Import</h1>
          <p className="text-muted-foreground mt-2">
            Import and manage LeetCode problems metadata from the official API
          </p>
        </div>
      </div>

      {/* Import Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Import Problems
          </CardTitle>
          <CardDescription>
            Fetch all LeetCode problems from the official GraphQL API and store in MongoDB
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button
              onClick={startImport}
              disabled={isImporting}
              size="lg"
              className="min-w-[200px]"
            >
              {isImporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing Problems...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Start Import
                </>
              )}
            </Button>
            
            <Button
              onClick={loadStats}
              disabled={isLoadingStats}
              variant="outline"
            >
              {isLoadingStats ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <BarChart3 className="mr-2 h-4 w-4" />
              )}
              Refresh Stats
            </Button>
          </div>

          {importResult && (
            <div className="p-3 bg-muted rounded-md font-mono text-sm">
              {importResult}
            </div>
          )}

          <div className="text-sm text-muted-foreground space-y-1">
            <p>• This will fetch all problems from LeetCode's GraphQL API</p>
            <p>• Problems are fetched in batches of 100 with 1-second delays</p>
            <p>• Existing problems will be replaced with fresh data</p>
            <p>• The process may take several minutes to complete</p>
          </div>
        </CardContent>
      </Card>

      {/* Stats Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Statistics
          </CardTitle>
          <CardDescription>
            Current state of the problems database
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats ? (
            <div className="space-y-6">
              {/* Total Problems */}
              <div className="text-center p-6 bg-primary/5 rounded-lg">
                <div className="text-3xl font-bold text-primary">{stats.total}</div>
                <div className="text-muted-foreground">Total Problems</div>
              </div>

              {/* Difficulty Breakdown */}
              <div>
                <h3 className="font-semibold mb-3">Problems by Difficulty</h3>
                <div className="grid grid-cols-3 gap-4">
                  {Object.entries(stats.byDifficulty).map(([difficulty, count]) => (
                    <div key={difficulty} className="text-center p-4 border rounded-lg">
                      <Badge className={getDifficultyColor(difficulty)}>
                        {difficulty}
                      </Badge>
                      <div className="text-2xl font-bold mt-2">{count}</div>
                      <div className="text-sm text-muted-foreground">
                        {stats.total > 0 ? Math.round((count / stats.total) * 100) : 0}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Topics */}
              <div>
                <h3 className="font-semibold mb-3">Top 10 Topics</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {stats.topTopics.map((topic, index) => (
                    <div key={topic.name} className="flex items-center justify-between p-3 border rounded">
                      <span className="font-medium">#{index + 1} {topic.name}</span>
                      <Badge variant="secondary">{topic.count}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {isLoadingStats ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading statistics...
                </div>
              ) : (
                "No data available. Please import problems first."
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}