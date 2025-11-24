import dayjs from "dayjs";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";

import {
  getFeedbackByInterviewId,
  getInterviewById,
} from "@/lib/actions/general.action";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/actions/auth.action";
import { RouteParams } from "@/types";

const Feedback = async ({ params }: RouteParams) => {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) redirect("/");

  const interview = await getInterviewById(id);
  if (!interview) redirect("/");

  const feedback = await getFeedbackByInterviewId({
    interviewId: id,
    userId: user.id,
  });

  if (!feedback) {
    return (
      <section className="section-feedback">
        <div className="flex flex-row justify-center">
          <h1 className="text-4xl font-semibold">
            No feedback found for this interview.
          </h1>
        </div>

        <div className="buttons mt-6">
          <Button className="btn-primary flex-1">
            <Link href={`/interview/${id}`} className="flex w-full justify-center">
              <p className="text-sm font-semibold text-black text-center">
                Back to Interview
              </p>
            </Link>
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="section-feedback px-4 sm:px-8 md:px-16 lg:px-24">
      <div className="flex flex-col sm:flex-row justify-center mb-6">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-center sm:text-left">
          Feedback on the Interview -{" "}
          <span className="capitalize">{interview.role}</span> Interview
        </h1>
      </div>

      <div className="flex flex-col sm:flex-row justify-center mb-6">
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-10 items-center">
          {/* Overall Impression */}
          <div className="flex flex-row gap-2 items-center">
            <Image src="/star.svg" width={22} height={22} alt="star" />
            <p className="text-base sm:text-lg">
              Overall Impression:{" "}
              <span className="text-primary-200 font-bold">
                {feedback?.totalScore}
              </span>
              /100
            </p>
          </div>

          {/* Date */}
          <div className="flex flex-row gap-2 items-center">
            <Image src="/calendar.svg" width={22} height={22} alt="calendar" />
            <p className="text-base sm:text-lg">
              {feedback?.createdAt
                ? dayjs(feedback.createdAt).format("MMM D, YYYY h:mm A")
                : "N/A"}
            </p>
          </div>
        </div>
      </div>

      <hr className="mb-6" />

      <p className="mb-6 text-base sm:text-lg">{feedback?.finalAssessment}</p>

      {/* Interview Breakdown */}
      <div className="flex flex-col gap-4 mb-6">
        <h2 className="text-xl sm:text-2xl font-semibold">Breakdown of the Interview:</h2>
        {feedback?.categoryScores?.map((category, index) => (
          <div key={index}>
            <p className="font-bold text-base sm:text-lg">
              {index + 1}. {category.name} ({category.score}/100)
            </p>
            <p className="text-base sm:text-lg">{category.comment}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 mb-6">
        <h3 className="text-lg sm:text-xl font-semibold">Strengths</h3>
        <ul className="list-disc list-inside">
          {feedback?.strengths?.map((strength, index) => (
            <li key={index} className="text-base sm:text-lg">{strength}</li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-3 mb-6">
        <h3 className="text-lg sm:text-xl font-semibold">Areas for Improvement</h3>
        <ul className="list-disc list-inside">
          {feedback?.areasForImprovement?.map((area, index) => (
            <li key={index} className="text-base sm:text-lg">{area}</li>
          ))}
        </ul>
      </div>

      <div className="buttons flex flex-col sm:flex-row gap-4">
        <Button className="btn-secondary flex-1">
          <Link href="/" className="flex w-full justify-center">
            <p className="text-sm sm:text-base font-semibold text-primary-200 text-center">
              Back to dashboard
            </p>
          </Link>
        </Button>

        <Button className="btn-primary flex-1">
          <Link
            href={`/interview/${id}`}
            className="flex w-full justify-center"
          >
            <p className="text-sm sm:text-base font-semibold text-black text-center">
              Retake Interview
            </p>
          </Link>
        </Button>
      </div>
    </section>
  );
};

export default Feedback;
