import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import axios from 'axios';
import RecordRTC, { StereoAudioRecorder } from 'recordrtc';

interface VoiceInterviewProps {
  cvId: number;
  resultId?: number;
  onComplete: (evaluation: any) => void;
}

export function VoiceInterview({ cvId, resultId, onComplete }: VoiceInterviewProps) {
  const { t, i18n } = useTranslation();
  const [questions, setQuestions] = useState<string[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(180); // 3 minutes
  const [isProcessing, setIsProcessing] = useState(false);
  const [interviewId, setInterviewId] = useState<number | null>(null);
  const [hasStarted, setHasStarted] = useState(false);

  const recorderRef = useRef<RecordRTC | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load interview questions
  useEffect(() => {
    const loadQuestions = async () => {
      try {
        const response = await axios.post('/api/ai/interview/start/', {
          cv_id: cvId,
          result_id: resultId
        });

        setQuestions(response.data.questions || []);
        setInterviewId(response.data.interview_id || null);
      } catch (error) {
        console.error('Failed to load interview questions:', error);
      }
    };

    loadQuestions();
  }, [cvId, resultId]);

  // Timer countdown
  useEffect(() => {
    if (isRecording && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            stopRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new RecordRTC(stream, {
        type: 'audio',
        mimeType: 'audio/webm',
        recorderType: StereoAudioRecorder,
        numberOfAudioChannels: 1,
      });

      recorder.startRecording();
      recorderRef.current = recorder;
      setIsRecording(true);
      setHasStarted(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
      alert(t('interview.mic_permission'));
    }
  };

  const stopRecording = () => {
    if (recorderRef.current && isRecording) {
      recorderRef.current.stopRecording(() => {
        submitInterview();
      });

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      setIsRecording(false);
    }
  };

  const submitInterview = async () => {
    if (!recorderRef.current) return;

    setIsProcessing(true);

    try {
      const blob = await recorderRef.current.getBlob();
      const formData = new FormData();
      formData.append('audio', blob, 'interview.webm');
      if (interviewId) {
        formData.append('interview_id', interviewId.toString());
      }

      const response = await axios.post('/api/ai/interview/submit/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      onComplete(response.data.evaluation);
    } catch (error) {
      console.error('Failed to submit interview:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const progressPercentage = ((180 - timeRemaining) / 180) * 100;

  if (questions.length === 0) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{t('interview.title')}</CardTitle>
        <CardDescription>{t('interview.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!hasStarted ? (
          <div className="space-y-4">
            <p className="text-center text-muted-foreground">
              {t('interview.description')}
            </p>
            <div className="flex justify-center">
              <Button
                onClick={startRecording}
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
              >
                <Mic className="mr-2 h-5 w-5" />
                {t('interview.start_button')}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>
                  {t('interview.question')} {currentQuestion + 1} of {questions.length}
                </span>
                <span>
                  {t('interview.time_remaining')}: {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                </span>
              </div>
              <Progress value={progressPercentage} />
            </div>

            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <p className="text-lg font-medium text-center">
                  {questions[currentQuestion]}
                </p>
              </CardContent>
            </Card>

            <div className="flex justify-center items-center gap-4">
              {isRecording ? (
                <>
                  <div className="flex items-center gap-2 text-red-600">
                    <div className="h-3 w-3 bg-red-600 rounded-full animate-pulse" />
                    <span className="font-medium">{t('interview.recording')}</span>
                  </div>
                  <Button
                    onClick={stopRecording}
                    variant="destructive"
                    size="lg"
                  >
                    <MicOff className="mr-2 h-5 w-5" />
                    {t('interview.stop_button')}
                  </Button>
                </>
              ) : isProcessing ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>{t('interview.processing')}</span>
                </div>
              ) : null}
            </div>

            {currentQuestion < questions.length - 1 && isRecording && (
              <div className="flex justify-center">
                <Button
                  onClick={() => setCurrentQuestion((prev) => prev + 1)}
                  variant="outline"
                >
                  {t('common.next')}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
