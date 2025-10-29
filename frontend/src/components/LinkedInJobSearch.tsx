import { useTranslation } from 'react-i18next';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { ExternalLink, Briefcase } from 'lucide-react';

interface LinkedInJobSearchProps {
  jobTitles: string[];
  city: string;
}

export function LinkedInJobSearch({ jobTitles, city }: LinkedInJobSearchProps) {
  const { t } = useTranslation();

  const searchLinkedIn = (jobTitle: string, location: string) => {
    // LinkedIn job search URL format
    const keywords = encodeURIComponent(jobTitle);
    const locationParam = encodeURIComponent(location);
    const url = `https://www.linkedin.com/jobs/search/?keywords=${keywords}&location=${locationParam}`;

    window.open(url, '_blank');
  };

  if (!jobTitles || jobTitles.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="h-5 w-5" />
          {t('results.job_titles')}
        </CardTitle>
        <CardDescription>
          {t('results.find_jobs')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {jobTitles.slice(0, 3).map((title, index) => (
          <Button
            key={index}
            onClick={() => searchLinkedIn(title, city)}
            variant="outline"
            className="w-full justify-between h-auto py-4 px-6 hover:bg-blue-50 hover:border-blue-300 transition-all"
          >
            <div className="flex flex-col items-start text-left">
              <span className="font-semibold text-base">{title}</span>
              <span className="text-sm text-muted-foreground">{city}</span>
            </div>
            <ExternalLink className="h-5 w-5 text-blue-600" />
          </Button>
        ))}

        <div className="pt-2 text-center">
          <a
            href="https://www.linkedin.com/jobs/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1"
          >
            {t('results.linkedin_search')}
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
