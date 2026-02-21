import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, CheckCircle2, AlertCircle } from 'lucide-react';

interface ReviewerAccuracyCardProps {
  userId: string;
}

interface ReviewerStats {
  user_id: string;
  institution: string;
  total_validations: number;
  confirmed_validations: number;
  corrected_validations: number;
  escalated_validations: number;
  high_confidence_count: number;
  moderate_confidence_count: number;
  limited_confidence_count: number;
  approved_count: number;
  rejected_count: number;
  approval_rate: number;
  last_validation_date: string | null;
}

export function ReviewerAccuracyCard({ userId }: ReviewerAccuracyCardProps) {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['reviewer-stats', userId],
    queryFn: async () => {
      try {
        // Use rpc or fallback to direct query with type assertion
        // The view is created in the migration but might not be in generated types yet
        const result = await (supabase as any)
          .from('reviewer_stats')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (result.error) throw result.error;
        return result.data as ReviewerStats;
      } catch (err) {
        throw err;
      }
    },
    enabled: !!userId
  });

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-lg">Your Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-500">Loading stats...</div>
        </CardContent>
      </Card>
    );
  }

  if (error || !stats) {
    return (
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-lg">Your Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-500">No data available yet</div>
        </CardContent>
      </Card>
    );
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
  };

  return (
    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Your Performance
          </CardTitle>
          {stats.institution && (
            <Badge variant="outline" className="text-xs">
              {stats.institution}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Validations Completed */}
          <div className="flex flex-col items-center p-3 bg-white rounded-lg border border-blue-100">
            <div className="text-2xl font-bold text-blue-600">{stats.total_validations}</div>
            <div className="text-xs text-gray-600 mt-1 text-center">Validations</div>
          </div>

          {/* Approval Rate */}
          <div className="flex flex-col items-center p-3 bg-white rounded-lg border border-green-100">
            <div className="text-2xl font-bold text-green-600">
              {isNaN(stats.approval_rate) ? '—' : `${Math.round(stats.approval_rate)}%`}
            </div>
            <div className="text-xs text-gray-600 mt-1 text-center">Approval Rate</div>
          </div>

          {/* High Confidence */}
          <div className="flex flex-col items-center p-3 bg-white rounded-lg border border-emerald-100">
            <div className="text-2xl font-bold text-emerald-600">{stats.high_confidence_count}</div>
            <div className="text-xs text-gray-600 mt-1 text-center">
              <span className="block">🟢 High</span>
            </div>
          </div>

          {/* Moderate Confidence */}
          <div className="flex flex-col items-center p-3 bg-white rounded-lg border border-amber-100">
            <div className="text-2xl font-bold text-amber-600">{stats.moderate_confidence_count}</div>
            <div className="text-xs text-gray-600 mt-1 text-center">
              <span className="block">🟡 Moderate</span>
            </div>
          </div>

          {/* Limited Confidence */}
          <div className="flex flex-col items-center p-3 bg-white rounded-lg border border-red-100">
            <div className="text-2xl font-bold text-red-600">{stats.limited_confidence_count}</div>
            <div className="text-xs text-gray-600 mt-1 text-center">
              <span className="block">🔴 Limited</span>
            </div>
          </div>

          {/* Last Validated */}
          <div className="flex flex-col items-center p-3 bg-white rounded-lg border border-gray-100">
            <div className="text-sm font-bold text-gray-600">{formatDate(stats.last_validation_date)}</div>
            <div className="text-xs text-gray-600 mt-1 text-center">Last Validated</div>
          </div>
        </div>

        {/* Summary Row */}
        <div className="mt-4 pt-4 border-t border-blue-100 flex items-center justify-between text-sm">
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-gray-700">
                Confirmed: <span className="font-semibold">{stats.confirmed_validations}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 text-amber-600">✎</div>
              <span className="text-gray-700">
                Corrected: <span className="font-semibold">{stats.corrected_validations}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span className="text-gray-700">
                Escalated: <span className="font-semibold">{stats.escalated_validations}</span>
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
