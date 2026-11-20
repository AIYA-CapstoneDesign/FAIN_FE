import Streaming from "../components/streaming/Streaming";
import PatientBasicInfo from "../components/streaming/PatientBasicInfo";
import PatientMedicalInfo from "../components/streaming/PatientMedicalInfo";
import PatientPhysicalInfo from "../components/streaming/PatientPhysicalInfo";
import SideHeader from "../components/common/SideHeader";
import useUserInfo from "../hooks/useUserInfo";

export default function StreamingPage() {
  const { data: userInfo } = useUserInfo();
  const patient = userInfo?.patient;

  if (!patient) return null;

  return (
    <>
      <SideHeader title="스트리밍" />
      <div className="px-10 pt-2 flex flex-col gap-8">
        <PatientBasicInfo name={patient.name} birth={patient.birth} />
        <Streaming />
        <PatientPhysicalInfo
          bloodtype={patient.bloodtype}
          height={patient.height}
          weight={patient.weight}
        />
        <PatientMedicalInfo
          disease={patient.disease}
          allergic={patient.allergic}
          medicine={patient.medicine}
        />
      </div>
    </>
  );
}
